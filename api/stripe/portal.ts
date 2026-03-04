import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import type { VercelRequest, VercelResponse } from '../types.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

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
  
  if (authError || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token or missing email' });
  }

  try {
    // Find Stripe Customer by email
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No Stripe customer found for this user' });
    }

    const customerId = customers.data[0].id;
    const origin = req.headers.origin || 'http://localhost:3000';

    // Create Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`, // Redirect back to profile page
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Portal Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
