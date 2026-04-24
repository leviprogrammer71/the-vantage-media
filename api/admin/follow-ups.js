// ==============================================
// Admin Follow-ups CRUD
// Vercel Serverless Function: /api/admin/follow-ups
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
        const { date, upcoming } = req.query;
        let query = supabase
          .from('follow_ups')
          .select('*, clients(name, business_name), projects(title)')
          .order('reminder_date')
          .order('reminder_time');

        if (date) {
          query = query.eq('reminder_date', date);
        } else if (upcoming === 'true') {
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('reminder_date', today).eq('is_completed', false).limit(20);
        }

        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'POST': {
        const { client_id, project_id, reminder_date, reminder_time, message, recurrence } = req.body;
        const { data, error } = await supabase
          .from('follow_ups')
          .insert({ client_id, project_id, reminder_date, reminder_time, message, recurrence: recurrence || 'none' })
          .select()
          .single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Follow-up ID required' });

        if (updates.is_completed) {
          updates.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('follow_ups')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Follow-up ID required' });
        const { error } = await supabase.from('follow_ups').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ deleted: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Follow-ups API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
