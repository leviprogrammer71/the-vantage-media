// ==============================================
// Stripe Webhook Handler
// Vercel Serverless Function: /api/stripe-webhook
// ==============================================
// Environment variables needed:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing for raw webhook body
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature invalid' });
    }

    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object;
        // Update invoice status in Supabase
        await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_invoice_id', invoice.id);

        // Create project update if linked
        const { data: dbInvoice } = await supabase
          .from('invoices')
          .select('project_id, amount, description')
          .eq('stripe_invoice_id', invoice.id)
          .single();

        if (dbInvoice?.project_id) {
          await supabase.from('project_updates').insert({
            project_id: dbInvoice.project_id,
            message: `Payment received: $${(dbInvoice.amount || 0).toLocaleString()} — ${dbInvoice.description || 'Invoice'}`,
            update_type: 'milestone',
            is_client_visible: true,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      case 'invoice.sent': {
        const invoice = event.data.object;
        await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
