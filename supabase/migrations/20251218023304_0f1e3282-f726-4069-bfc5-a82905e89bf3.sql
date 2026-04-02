-- User subscription and credits
CREATE TABLE public.user_subscriptions (
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
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  description TEXT,
  image_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website consultations
CREATE TABLE public.website_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_url TEXT NOT NULL,
  consultation_report JSONB,
  report_html TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing plans reference
CREATE TABLE public.pricing_plans (
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
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for website_consultations
CREATE POLICY "Users can view their own consultations"
ON public.website_consultations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consultations"
ON public.website_consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consultations"
ON public.website_consultations FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for pricing_plans (public read)
CREATE POLICY "Anyone can view pricing plans"
ON public.pricing_plans FOR SELECT
USING (true);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (id, name, price_monthly, price_annual, credits_monthly, consultations_monthly, is_popular, sort_order, features) VALUES
('free', 'Free Trial', 0, 0, 5, 0, false, 0, '{"features": ["5 free photo enhancements", "All enhancement features", "Standard resolution download", "Email support"]}'),
('starter', 'Starter', 1900, 18000, 25, 1, false, 1, '{"features": ["25 photos/month", "All enhancement features", "HD resolution download", "Credits roll over", "1 website consultation/month", "Email support"]}'),
('professional', 'Professional', 4900, 46800, 100, 3, true, 2, '{"features": ["100 photos/month", "All enhancement features", "4K resolution download", "Credits roll over", "3 website consultations/month", "Priority support", "Virtual staging included", "Day-to-dusk included"]}'),
('agency', 'Agency', 9900, 94800, 300, 10, false, 3, '{"features": ["300 photos/month", "All enhancement features", "4K resolution download", "Unlimited rollover", "10 website consultations/month", "Priority phone support", "Team accounts (up to 5)", "API access", "White-label options"]}'),
('enterprise', 'Enterprise', 19900, 190800, -1, -1, false, 4, '{"features": ["Unlimited photos", "All enhancement features", "4K resolution download", "Unlimited consultations", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Team accounts (unlimited)"]}');

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

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();