import Stripe from 'stripe';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import type { VercelRequest, VercelResponse } from '../_lib/types.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// TODO: Replace with actual Price IDs from Stripe Dashboard
// Or use environment variables for flexibility
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_dummy',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_dummy',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!supabaseAdmin) {
      console.error('Supabase Admin not initialized');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { plan } = req.body;
    
    if (!plan || !PRICE_IDS[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const priceId = PRICE_IDS[plan];
    const origin = req.headers.origin || 'http://localhost:3000'; // Fallback for testing

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: { 
        userId: user.id, 
        plan 
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
