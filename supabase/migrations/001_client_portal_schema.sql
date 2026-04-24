-- =============================================
-- CLIENT PORTAL & BUSINESS OPERATIONS SCHEMA
-- Migration: 001_client_portal_schema.sql
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  business_name TEXT,
  business_type TEXT, -- 'restaurant', 'author', 'church', 'contractor', etc.
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'review', 'completed'
  estimated_completion_date DATE,
  actual_completion_date DATE,
  progress_percentage INTEGER DEFAULT 0,
  days_remaining INTEGER,
  package_type TEXT,
  total_price DECIMAL(10,2),
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROJECT UPDATES
-- =============================================
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  update_type TEXT DEFAULT 'progress', -- 'progress', 'milestone', 'delivery', 'note'
  is_client_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FOLLOW-UP REMINDERS (admin only)
-- =============================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  reminder_date DATE NOT NULL,
  reminder_time TIME DEFAULT '09:00',
  message TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  recurrence TEXT DEFAULT 'none', -- 'none', 'daily', 'weekly', 'biweekly'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICES / PAYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  stripe_invoice_id TEXT,
  stripe_payment_link TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ONBOARDING FORMS / INTAKE
-- =============================================
CREATE TABLE IF NOT EXISTS intake_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  form_type TEXT DEFAULT 'new_client', -- 'new_client', 'website', 'photography', 'content'
  form_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VIDEO DELIVERABLES
-- =============================================
CREATE TABLE IF NOT EXISTS video_deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  video_type TEXT DEFAULT 'walkthrough', -- 'walkthrough', 'presentation', 'tutorial'
  is_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHAT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  role TEXT NOT NULL, -- 'user', 'assistant', 'admin'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRICING PACKAGES
-- =============================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  features JSONB,
  package_type TEXT, -- 'website', 'brand_photography', 'content_strategy', 'full_ecosystem', 'automation'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENT POLICIES (they see only their own records)
-- =============================================
CREATE POLICY "Clients see own data" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Clients see own projects" ON projects
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients see own tasks" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients see visible updates" ON project_updates
  FOR SELECT USING (
    is_client_visible = TRUE AND project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients see own invoices" ON invoices
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients see own intake forms" ON intake_forms
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients see own videos" ON video_deliverables
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients manage own chats" ON chat_messages
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Packages are public" ON packages
  FOR SELECT USING (is_active = TRUE);

-- =============================================
-- ADMIN POLICIES (service_role bypasses RLS,
-- but these allow admin user_id direct access)
-- =============================================
CREATE POLICY "Admin full access clients" ON clients
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access projects" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access tasks" ON tasks
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access updates" ON project_updates
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access invoices" ON invoices
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access intake_forms" ON intake_forms
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access video_deliverables" ON video_deliverables
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access chat_messages" ON chat_messages
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access follow_ups" ON follow_ups
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

CREATE POLICY "Admin full access packages" ON packages
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

-- =============================================
-- HELPER FUNCTION: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DEFAULT PACKAGES
-- =============================================
INSERT INTO packages (name, description, price, features, package_type) VALUES
(
  'Brand Photography',
  'Professional on-location photo shoot with edited high-res images',
  850.00,
  '["On-location photo shoot (2-4 hours)", "25 edited high-res images", "Digital delivery within 7 days", "Commercial usage rights"]',
  'brand_photography'
),
(
  'Website Build',
  'Custom-designed, mobile-responsive website with SEO fundamentals',
  2500.00,
  '["Custom design (not templates)", "Mobile responsive", "SEO basics", "3 rounds of revision", "Launch within 4 weeks"]',
  'website'
),
(
  'Content Strategy',
  'Complete content strategy with audit, calendar, and posting plan',
  1200.00,
  '["Platform audit", "Content calendar (30 days)", "5 infographic/video concepts", "Posting strategy", "Competitor analysis"]',
  'content_strategy'
),
(
  'Full Brand Ecosystem',
  'The complete package — photography, website, content, and automation',
  5500.00,
  '["Everything in Photography + Website + Content", "Chatbot/SMS integration", "Payment/scheduling integration", "Admin control panel", "30-day post-launch support"]',
  'full_ecosystem'
),
(
  'Automation Add-On',
  'Chatbot, payment, calendar, and CRM integrations for your business',
  1500.00,
  '["Chatbot setup (social + SMS)", "Payment integration (Stripe/PayPal)", "Calendar/scheduling integration", "CRM setup"]',
  'automation'
);
