// ==============================================
// AI Chat Endpoint — Gemini via OpenRouter
// Vercel Serverless Function: /api/chat
// ==============================================
// Environment variables needed:
//   OPENROUTER_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, projectId, message } = req.body;

    if (!clientId || !projectId || !message) {
      return res.status(400).json({ error: 'Missing required fields: clientId, projectId, message' });
    }

    // Verify auth token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify client belongs to user
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch project context
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');

    const { data: updates } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build system prompt with project context
    const completedTasks = (tasks || []).filter(t => t.status === 'completed').map(t => t.title).join(', ');
    const currentTask = (tasks || []).find(t => t.status === 'in_progress');
    const pendingTasks = (tasks || []).filter(t => t.status === 'pending').map(t => t.title).join(', ');
    const recentUpdates = (updates || []).map(u => u.message).join(' | ');

    const systemPrompt = `You are a helpful project assistant for a creative brand studio called The Vantage.
You have access to this client's project information:

Client: ${client.name}
Project: ${project?.title || 'Unknown'}
Status: ${project?.status || 'Unknown'}
Progress: ${project?.progress_percentage || 0}%
Days remaining: ${project?.days_remaining || 'Not set'}
Estimated completion: ${project?.estimated_completion_date || 'Not set'}

Completed tasks: ${completedTasks || 'None yet'}
Current task: ${currentTask?.title || 'None in progress'}
Upcoming tasks: ${pendingTasks || 'None scheduled'}

Recent updates: ${recentUpdates || 'No recent updates'}

Answer the client's questions about their project status, timeline, and deliverables.
Be warm, professional, and transparent. If you don't know something specific,
suggest they reach out directly to the team.
Do NOT make up information not in the context above.
Keep responses concise — 2-3 sentences max unless more detail is requested.`;

    // Call Gemini via OpenRouter
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await aiResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I wasn\'t able to process that. Please try again.';

    // Save both messages to Supabase
    await supabase.from('chat_messages').insert([
      { client_id: clientId, project_id: projectId, role: 'user', content: message },
      { client_id: clientId, project_id: projectId, role: 'assistant', content: reply },
    ]);

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
