// ==============================================
// Admin Clients CRUD
// Vercel Serverless Function: /api/admin/clients
// ==============================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user || user.id !== process.env.ADMIN_USER_ID) return null;
  return user;
}

export default async function handler(req, res) {
  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('clients')
          .select('*, projects(id, title, status)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'POST': {
        const { name, email, phone, business_name, business_type } = req.body;
        const { data, error } = await supabase
          .from('clients')
          .insert({ name, email, phone, business_name, business_type })
          .select()
          .single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Client ID required' });
        const { data, error } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
