// ==============================================
// Create Stripe Payment Link
// Vercel Serverless Function: /api/create-payment-link
// ==============================================
// Environment variables needed:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_USER_ID

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin auth
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { amount, description, clientId, projectId } = req.body;

    // Create a Stripe product + price for this payment
    const product = await stripe.products.create({
      name: description || 'Service Payment',
      metadata: { client_id: clientId || '', project_id: projectId || '' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
    });

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { client_id: clientId || '', project_id: projectId || '' },
      after_completion: {
        type: 'redirect',
        redirect: { url: `${req.headers.origin || 'https://yourdomain.com'}/client-dashboard?payment=success` },
      },
    });

    return res.status(200).json({
      url: paymentLink.url,
      id: paymentLink.id,
    });
  } catch (error) {
    console.error('Payment link error:', error);
    return res.status(500).json({ error: error.message });
  }
}
