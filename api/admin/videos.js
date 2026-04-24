// ==============================================
// Admin Video Deliverables CRUD
// Vercel Serverless Function: /api/admin/videos
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
        let query = supabase.from('video_deliverables').select('*, projects(title, client_id)').order('created_at', { ascending: false });
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'POST': {
        const { project_id, title, description, video_url, thumbnail_url, video_type } = req.body;
        const { data, error } = await supabase
          .from('video_deliverables')
          .insert({ project_id, title, description, video_url, thumbnail_url, video_type: video_type || 'walkthrough' })
          .select()
          .single();
        if (error) throw error;

        // Auto-create project update
        await supabase.from('project_updates').insert({
          project_id,
          message: `New video walkthrough available: ${title}`,
          update_type: 'delivery',
          is_client_visible: true,
        });

        return res.status(201).json(data);
      }

      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Video ID required' });
        const { error } = await supabase.from('video_deliverables').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ deleted: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Videos API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
