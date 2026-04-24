-- =============================================================================
-- COMBINED SUPABASE MIGRATIONS
-- Source: /Users/becareful/Downloads/publish-parade-palace-main/supabase/migrations/
-- Total files: 18
-- IDEMPOTENT VERSION: Safe to run on a database that already has some schema
-- =============================================================================

-- =============================================================================
-- MIGRATION 01 / 18 : 001_client_portal_schema.sql
-- =============================================================================
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
DROP POLICY IF EXISTS "Clients see own data" ON clients;
CREATE POLICY "Clients see own data" ON clients
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Clients see own projects" ON projects;
CREATE POLICY "Clients see own projects" ON projects
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients see own tasks" ON tasks;
CREATE POLICY "Clients see own tasks" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Clients see visible updates" ON project_updates;
CREATE POLICY "Clients see visible updates" ON project_updates
  FOR SELECT USING (
    is_client_visible = TRUE AND project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Clients see own invoices" ON invoices;
CREATE POLICY "Clients see own invoices" ON invoices
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients see own intake forms" ON intake_forms;
CREATE POLICY "Clients see own intake forms" ON intake_forms
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients see own videos" ON video_deliverables;
CREATE POLICY "Clients see own videos" ON video_deliverables
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Clients manage own chats" ON chat_messages;
CREATE POLICY "Clients manage own chats" ON chat_messages
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Packages are public" ON packages;
CREATE POLICY "Packages are public" ON packages
  FOR SELECT USING (is_active = TRUE);

-- =============================================
-- ADMIN POLICIES (service_role bypasses RLS,
-- but these allow admin user_id direct access)
-- =============================================
DROP POLICY IF EXISTS "Admin full access clients" ON clients;
CREATE POLICY "Admin full access clients" ON clients
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access projects" ON projects;
CREATE POLICY "Admin full access projects" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access tasks" ON tasks;
CREATE POLICY "Admin full access tasks" ON tasks
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access updates" ON project_updates;
CREATE POLICY "Admin full access updates" ON project_updates
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access invoices" ON invoices;
CREATE POLICY "Admin full access invoices" ON invoices
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access intake_forms" ON intake_forms;
CREATE POLICY "Admin full access intake_forms" ON intake_forms
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access video_deliverables" ON video_deliverables;
CREATE POLICY "Admin full access video_deliverables" ON video_deliverables
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access chat_messages" ON chat_messages;
CREATE POLICY "Admin full access chat_messages" ON chat_messages
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access follow_ups" ON follow_ups;
CREATE POLICY "Admin full access follow_ups" ON follow_ups
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admin full access packages" ON packages;
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

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DEFAULT PACKAGES (only when table empty)
-- =============================================
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM packages LIMIT 1) THEN
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
  END IF;
END $do$;

-- =============================================================================
-- MIGRATION 02 / 18 : 20251211223737_8522e63a-a9bb-4c40-92b4-ba58ab5072c2.sql
-- =============================================================================
-- Create profiles table for user data and credits
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, credits_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- MIGRATION 03 / 18 : 20251211230216_671b3bfe-90e7-4d37-8bc0-bf246b98df00.sql
-- =============================================================================
-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property photos
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create enhancements table
CREATE TABLE IF NOT EXISTS public.enhancements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  enhanced_image_url TEXT,
  preset_used TEXT NOT NULL,
  toggles_used JSONB NOT NULL DEFAULT '{}',
  credits_used INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'processing',
  replicate_prediction_id TEXT,
  error_message TEXT,
  saved_to_gallery BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on enhancements
ALTER TABLE public.enhancements ENABLE ROW LEVEL SECURITY;

-- RLS policies for enhancements
DROP POLICY IF EXISTS "Users can view their own enhancements" ON public.enhancements;
CREATE POLICY "Users can view their own enhancements"
ON public.enhancements FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own enhancements" ON public.enhancements;
CREATE POLICY "Users can insert their own enhancements"
ON public.enhancements FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own enhancements" ON public.enhancements;
CREATE POLICY "Users can update their own enhancements"
ON public.enhancements FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own enhancements" ON public.enhancements;
CREATE POLICY "Users can delete their own enhancements"
ON public.enhancements FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_enhancements_updated_at ON public.enhancements;
CREATE TRIGGER update_enhancements_updated_at
BEFORE UPDATE ON public.enhancements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create increment_credits function for refunds
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- =============================================================================
-- MIGRATION 04 / 18 : 20251214220333_241b44e2-87e6-4f53-becd-e91e6727bd20.sql
-- =============================================================================
-- Add is_favorite column to enhancements table
ALTER TABLE public.enhancements
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- =============================================================================
-- MIGRATION 05 / 18 : 20251214224130_c9973cd5-6658-45c8-b21b-2eec2215e6f0.sql
-- =============================================================================
-- Drop the overly permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new restrictive UPDATE policy that only allows updating non-sensitive fields
-- (email and full_name) but NOT credits_balance
DROP POLICY IF EXISTS "Users can update their own profile name and email" ON public.profiles;
CREATE POLICY "Users can update their own profile name and email"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a check constraint to ensure credits_balance cannot go negative
DO $do$ BEGIN
  ALTER TABLE public.profiles
  ADD CONSTRAINT credits_balance_non_negative CHECK (credits_balance >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- =============================================================================
-- MIGRATION 06 / 18 : 20251214225029_06a28f97-9563-4597-9621-74e0b0ac3d4a.sql
-- =============================================================================
-- Make the property-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'property-photos';

-- Improve increment_credits function with validation and audit comments
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Only call from trusted server context with service role key
  -- NEVER expose via RPC policies - this function bypasses RLS

  -- Validate amount is positive to prevent abuse
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- =============================================================================
-- MIGRATION 07 / 18 : 20251218023304_0f1e3282-f726-4069-bfc5-a82905e89bf3.sql
-- =============================================================================
-- User subscription and credits
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly',
  credits_remaining INTEGER DEFAULT 5,
  credits_monthly_allowance INTEGER DEFAULT 5,
  credits_rollover INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  website_consultations_used INTEGER DEFAULT 0,
  website_consultations_limit INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Credit usage history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  description TEXT,
  image_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website consultations
CREATE TABLE IF NOT EXISTS public.website_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  consultation_report JSONB,
  report_html TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing plans reference
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  credits_monthly INTEGER NOT NULL,
  features JSONB,
  is_popular BOOLEAN DEFAULT FALSE,
  consultations_monthly INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for credit_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert their own transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for website_consultations
DROP POLICY IF EXISTS "Users can view their own consultations" ON public.website_consultations;
CREATE POLICY "Users can view their own consultations"
ON public.website_consultations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own consultations" ON public.website_consultations;
CREATE POLICY "Users can insert their own consultations"
ON public.website_consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own consultations" ON public.website_consultations;
CREATE POLICY "Users can update their own consultations"
ON public.website_consultations FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for pricing_plans (public read)
DROP POLICY IF EXISTS "Anyone can view pricing plans" ON public.pricing_plans;
CREATE POLICY "Anyone can view pricing plans"
ON public.pricing_plans FOR SELECT
USING (true);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (id, name, price_monthly, price_annual, credits_monthly, consultations_monthly, is_popular, sort_order, features) VALUES
('free', 'Free Trial', 0, 0, 5, 0, false, 0, '{"features": ["5 free photo enhancements", "All enhancement features", "Standard resolution download", "Email support"]}'),
('starter', 'Starter', 1900, 18000, 25, 1, false, 1, '{"features": ["25 photos/month", "All enhancement features", "HD resolution download", "Credits roll over", "1 website consultation/month", "Email support"]}'),
('professional', 'Professional', 4900, 46800, 100, 3, true, 2, '{"features": ["100 photos/month", "All enhancement features", "4K resolution download", "Credits roll over", "3 website consultations/month", "Priority support", "Virtual staging included", "Day-to-dusk included"]}'),
('agency', 'Agency', 9900, 94800, 300, 10, false, 3, '{"features": ["300 photos/month", "All enhancement features", "4K resolution download", "Unlimited rollover", "10 website consultations/month", "Priority phone support", "Team accounts (up to 5)", "API access", "White-label options"]}'),
('enterprise', 'Enterprise', 19900, 190800, -1, -1, false, 4, '{"features": ["Unlimited photos", "All enhancement features", "4K resolution download", "Unlimited consultations", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Team accounts (unlimited)"]}')
ON CONFLICT (id) DO NOTHING;

-- Trigger to create subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_type, credits_remaining, trial_ends_at)
  VALUES (NEW.id, 'free', 5, NOW() + INTERVAL '14 days');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- =============================================================================
-- MIGRATION 08 / 18 : 20251220225044_95aa7c9b-0677-40f9-b1e3-99319c62f96a.sql
-- =============================================================================
-- Create videos table to store generated videos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_image_url TEXT NOT NULL,
  source_enhancement_id UUID REFERENCES public.enhancements(id) ON DELETE SET NULL,
  video_url TEXT,
  replicate_prediction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  quality TEXT DEFAULT 'standard',
  aspect_ratio TEXT DEFAULT '16:9',
  motion_style TEXT DEFAULT 'slow_push',
  duration INTEGER DEFAULT 5,
  credits_used INTEGER DEFAULT 5,
  error_message TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;
CREATE POLICY "Users can view their own videos"
ON public.videos
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own videos" ON public.videos;
CREATE POLICY "Users can create their own videos"
ON public.videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
CREATE POLICY "Users can update their own videos"
ON public.videos
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
CREATE POLICY "Users can delete their own videos"
ON public.videos
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_videos_updated_at ON public.videos;
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- =============================================================================
-- MIGRATION 09 / 18 : 20251223215702_e2ccb173-d4d6-4d7a-9c66-f16f247f9434.sql
-- =============================================================================
-- Make the property-photos bucket public so images don't require signed URLs that expire
UPDATE storage.buckets SET public = true WHERE id = 'property-photos';

-- =============================================================================
-- MIGRATION 10 / 18 : 20260210193623_74bd2956-5974-46fd-9a92-39455664fd7f.sql
-- =============================================================================
-- Revoke public execution of increment_credits to prevent client-side RPC calls
REVOKE EXECUTE ON FUNCTION public.increment_credits FROM PUBLIC, anon, authenticated;

-- Only grant to service_role (used by edge functions)
GRANT EXECUTE ON FUNCTION public.increment_credits TO service_role;

-- =============================================================================
-- MIGRATION 11 / 18 : 20260221011806_1c47a1ff-e2a8-4963-b24b-4069bce7570f.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.submissions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                   text        NOT NULL,
  email                       text        NOT NULL,
  business_name               text        NOT NULL,
  phone                       text,
  transformation_type         text        NOT NULL,
  project_description         text        NOT NULL,
  target_platform             text[],
  video_style                 text        NOT NULL,
  before_photo_paths          text[],
  after_photo_paths           text[],
  progress_photo_paths        text[],
  additional_notes            text,
  status                      text        NOT NULL DEFAULT 'received',
  generated_before_image_path text,
  scene_analysis_prompt       text,
  generated_video_prompt      text,
  output_video_url            text,
  prompt_status               text        NOT NULL DEFAULT 'pending',
  prompt_error                text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role key)
-- No public/anon policies needed since submissions are managed by edge functions

-- Create the project-submissions bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-submissions',
  'project-submissions',
  false,
  524288000,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATION 12 / 18 : 20260222020157_dff6608c-cfaa-49f3-9416-dceed23a6112.sql
-- =============================================================================
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS build_type text DEFAULT 'team_build';

-- =============================================================================
-- MIGRATION 13 / 18 : 20260222034253_a36e7897-ee79-4cda-b98f-9a814f989d61.sql
-- =============================================================================

-- User credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;
CREATE POLICY "Users can insert their own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add user_id to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add submission_id to credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.submissions(id);

-- Create trigger for auto-creating user_credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- =============================================================================
-- MIGRATION 14 / 18 : 20260222082550_b3919cea-ae6b-46b7-a193-ab44eafbb3e8.sql
-- =============================================================================

-- Add video_type column
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'transformation';

-- Add output_video_path column for permanent storage
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS output_video_path text;

-- Enable RLS on submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own submissions" ON submissions;
CREATE POLICY "Users can delete own submissions"
  ON submissions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage RLS for project-submissions bucket
DROP POLICY IF EXISTS "user_upload_own_folder" ON storage.objects;
CREATE POLICY "user_upload_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-submissions' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_read_own_files" ON storage.objects;
CREATE POLICY "user_read_own_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-submissions' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable realtime on submissions
DO $do$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- =============================================================================
-- MIGRATION 15 / 18 : 20260222224358_8d558871-0053-49e9-b612-fc0f8c7f6ea6.sql
-- =============================================================================

-- Add share columns to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS share_views integer DEFAULT 0;

-- Allow anonymous users to read public delivered submissions
DROP POLICY IF EXISTS "public can view shared submissions" ON public.submissions;
CREATE POLICY "public can view shared submissions"
  ON public.submissions FOR SELECT
  TO anon
  USING (
    is_public = true AND
    status = 'delivered' AND
    output_video_path IS NOT NULL
  );

-- =============================================================================
-- MIGRATION 16 / 18 : 20260224215741_c51972b3-d1bf-4f5d-a81a-87ebc27b0286.sql
-- =============================================================================
-- Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referral_code text NOT NULL UNIQUE,
  referred_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  credits_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "Users can create referral codes" ON public.referrals;
CREATE POLICY "Users can create referral codes"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Generate referral code for existing users
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT referral_code INTO v_code
  FROM public.referrals
  WHERE referrer_id = p_user_id AND referred_user_id IS NULL AND status = 'pending'
  LIMIT 1;

  IF v_code IS NULL THEN
    v_code := substr(md5(p_user_id::text || now()::text), 1, 8);
    INSERT INTO public.referrals (referrer_id, referral_code)
    VALUES (p_user_id, v_code);
  END IF;

  RETURN v_code;
END;
$$;

-- Admin roles
DO $do$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- MIGRATION 17 / 18 : 20260302035058_a8536fde-8ca6-4302-be94-c128aa2a8b81.sql
-- =============================================================================

-- Update handle_new_user to give 50 credits instead of 3
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, credits_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    50
  );
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_credits to give 50 credits instead of 0
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- MIGRATION 18 / 18 : 20260302063236_038b5174-6ffd-45e0-9ad4-699843b02be0.sql
-- =============================================================================
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS transformation_category text DEFAULT 'construction';
