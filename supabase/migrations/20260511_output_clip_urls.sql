-- ── Persist clip URLs so bundle videos can be backfilled ──
--
-- Background:
--   listing_bundle / done_for_you_reel produce an array of Replicate URLs
--   that we download + upload to permanent Supabase storage. If the storage
--   upload fails transiently, output_clip_paths is empty and the only
--   reference we have to the source video is gone the moment Replicate
--   purges the URL (~24h later). This left bundle submissions with broken
--   gallery thumbnails after a day.
--
-- Fix:
--   Store the original Replicate clip URLs alongside the paths so a future
--   backfill pass can re-download the source video (if still alive) and
--   persist it permanently.
--
--   For single-video paths, output_video_url already exists — this just
--   gives bundles the same capability.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS output_clip_urls text[];

COMMENT ON COLUMN public.submissions.output_clip_urls IS
  'Original Replicate URLs for bundle clips. Used to backfill output_clip_paths if the original storage upload failed. URLs expire ~24h after generation.';
