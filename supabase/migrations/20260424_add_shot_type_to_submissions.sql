-- Add shot_type column to submissions table for multi-shot video system
-- Supports Rendy-style shot selection: slow_push, drone_orbit, parallax_pan, reveal_rise, architectural, establishing
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS shot_type text DEFAULT 'slow_push';
