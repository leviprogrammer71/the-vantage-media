
-- Add share columns to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS share_views integer DEFAULT 0;

-- Allow anonymous users to read public delivered submissions
CREATE POLICY "public can view shared submissions"
  ON public.submissions FOR SELECT
  TO anon
  USING (
    is_public = true AND
    status = 'delivered' AND
    output_video_path IS NOT NULL
  );
