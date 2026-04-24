// ==============================================
// Admin Tasks CRUD
// Vercel Serverless Function: /api/admin/tasks
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
        const { projectId } = req.query;
        let query = supabase.from('tasks').select('*').order('sort_order');
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'POST': {
        const { project_id, title, description, sort_order } = req.body;
        const { data, error } = await supabase
          .from('tasks')
          .insert({ project_id, title, description, sort_order: sort_order || 0 })
          .select()
          .single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Task ID required' });

        // If marking completed, set completed_at
        if (updates.status === 'completed') {
          updates.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;

        // If task completed, create a project update
        if (updates.status === 'completed' && data.project_id) {
          await supabase.from('project_updates').insert({
            project_id: data.project_id,
            message: `Task completed: ${data.title}`,
            update_type: 'milestone',
            is_client_visible: true,
          });
        }

        return res.status(200).json(data);
      }

      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Task ID required' });
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ deleted: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
