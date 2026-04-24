// ==============================================
// Create Stripe Invoice — Admin Only
// Vercel Serverless Function: /api/create-invoice
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

    const { clientId, projectId, amount, description, dueDate } = req.body;

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Create or retrieve Stripe customer
    let stripeCustomer;
    const existing = await stripe.customers.list({ email: client.email, limit: 1 });
    if (existing.data.length > 0) {
      stripeCustomer = existing.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email: client.email,
        name: client.name,
        metadata: { client_id: clientId },
      });
    }

    // Create Stripe invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomer.id,
      collection_method: 'send_invoice',
      days_until_due: dueDate ? Math.ceil((new Date(dueDate) - new Date()) / 86400000) : 30,
      metadata: { client_id: clientId, project_id: projectId || '' },
    });

    // Add line item
    await stripe.invoiceItems.create({
      customer: stripeCustomer.id,
      invoice: invoice.id,
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      description: description || 'Service invoice',
    });

    // Finalize and send
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    // Save to Supabase
    const { data: dbInvoice } = await supabase.from('invoices').insert({
      client_id: clientId,
      project_id: projectId || null,
      stripe_invoice_id: invoice.id,
      stripe_payment_link: finalizedInvoice.hosted_invoice_url,
      amount,
      status: 'sent',
      due_date: dueDate || null,
      description,
    }).select().single();

    // Create project update
    if (projectId) {
      await supabase.from('project_updates').insert({
        project_id: projectId,
        message: `Invoice sent: $${amount.toLocaleString()} — ${description}`,
        update_type: 'note',
        is_client_visible: true,
      });
    }

    return res.status(200).json({
      invoice: dbInvoice,
      stripe_invoice_id: invoice.id,
      payment_url: finalizedInvoice.hosted_invoice_url,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ error: error.message });
  }
}
