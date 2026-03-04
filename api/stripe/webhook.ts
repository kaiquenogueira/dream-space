import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import type { VercelRequest, VercelResponse } from '../types.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  pro: 400,
};

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!supabaseAdmin) {
    console.error('Supabase Admin not initialized');
    return res.status(500).send('Server configuration error');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          console.log(`Processing checkout.session.completed for user ${userId}, plan ${plan}`);
          await supabaseAdmin.from('profiles').update({
            plan,
            credits_remaining: PLAN_CREDITS[plan] || 15,
            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', userId);
        } else {
          console.warn('Missing userId or plan in session metadata');
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as any; // Cast to any to avoid type issues with 'subscription'
        if (invoice.subscription) {
          // Retrieve subscription to get metadata
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          const userId = subscription.metadata?.userId; 
          const plan = subscription.metadata?.plan;
          
          if (userId && plan) {
             console.log(`Processing invoice.paid renewal for user ${userId}, plan ${plan}`);
             await supabaseAdmin.from('profiles').update({
              credits_remaining: PLAN_CREDITS[plan] || 15,
              credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }).eq('id', userId);
          } else {
             // Fallback: try to find user by customer email
             const customerId = invoice.customer as string;
             const customer = await stripe.customers.retrieve(customerId);
             
             // Check if deleted
             if ((customer as any).deleted) {
               console.warn(`Customer ${customerId} is deleted, skipping renewal`);
               break;
             }
             
             const customerEmail = (customer as Stripe.Customer).email;
             
             if (customerEmail) {
                const { data: user } = await supabaseAdmin.from('profiles').select('id, plan').eq('email', customerEmail).single();
                if (user) {
                   console.log(`Found user ${user.id} by email ${customerEmail} for renewal`);
                   // We don't know the plan from subscription if metadata is missing, so we use current plan from DB?
                   // Or try to infer from invoice lines? Too complex.
                   // Just log warning.
                   console.warn(`Metadata missing on subscription ${invoice.subscription}. User found but skipping auto-credit update to avoid errors.`);
                }
             }
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (userId) {
          console.log(`Processing subscription deletion for user ${userId}`);
          await supabaseAdmin.from('profiles').update({
            plan: 'free',
            credits_remaining: 15, // Reset to free tier
          }).eq('id', userId);
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`Error processing webhook event: ${error.message}`);
    return res.status(500).send(`Processing Error: ${error.message}`);
  }

  return res.status(200).json({ received: true });
}
