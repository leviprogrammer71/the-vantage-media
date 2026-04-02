-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create enhancements table
CREATE TABLE public.enhancements (
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
CREATE POLICY "Users can view their own enhancements"
ON public.enhancements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enhancements"
ON public.enhancements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enhancements"
ON public.enhancements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enhancements"
ON public.enhancements FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
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