// ==============================================
// Admin Projects CRUD
// Vercel Serverless Function: /api/admin/projects
// ==============================================
// Supports: GET (list all), POST (create), PUT (update), DELETE

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
          .from('projects')
          .select('*, clients(name, email, business_name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'POST': {
        const { client_id, title, description, status, estimated_completion_date, package_type, total_price } = req.body;
        const { data, error } = await supabase
          .from('projects')
          .insert({ client_id, title, description, status, estimated_completion_date, package_type, total_price })
          .select()
          .single();
        if (error) throw error;

        // Auto-create welcome update
        await supabase.from('project_updates').insert({
          project_id: data.id,
          message: `Welcome! We've received your intake form and will begin work shortly.`,
          update_type: 'milestone',
          is_client_visible: true,
        });

        // Auto-create follow-up reminders
        const reminders = [
          { days: 3, message: 'Check-in: How\'s the kickoff going?' },
          { days: 5, message: 'Progress update reminder' },
        ];
        for (const r of reminders) {
          const date = new Date();
          date.setDate(date.getDate() + r.days);
          await supabase.from('follow_ups').insert({
            client_id,
            project_id: data.id,
            reminder_date: date.toISOString().split('T')[0],
            message: r.message,
          });
        }

        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Project ID required' });
        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Project ID required' });
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ deleted: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Projects API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
