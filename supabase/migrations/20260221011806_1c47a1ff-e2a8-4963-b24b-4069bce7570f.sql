
CREATE TABLE public.submissions (
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
