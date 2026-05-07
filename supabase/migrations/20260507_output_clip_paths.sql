-- Persist every individual clip path on the submissions row.
--
-- Today the edge function already uploads each per-photo clip to Supabase
-- Storage during a Done-For-You / Listing Bundle render. But the client
-- only persists the FIRST clip's path into submissions.output_video_path,
-- so the other clips are unreachable from the gallery — they exist in
-- storage but the app never reads them.
--
-- This adds an array column for all per-clip paths. The Gallery renders
-- one download button per clip when this is populated.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS output_clip_paths text[];
