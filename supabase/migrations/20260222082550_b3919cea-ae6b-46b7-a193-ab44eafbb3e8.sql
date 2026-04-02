
-- Add video_type column
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'transformation';

-- Add output_video_path column for permanent storage
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS output_video_path text;

-- Enable RLS on submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for submissions
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
  ON submissions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage RLS for project-submissions bucket
CREATE POLICY "user_upload_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-submissions' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_read_own_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-submissions' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable realtime on submissions
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
