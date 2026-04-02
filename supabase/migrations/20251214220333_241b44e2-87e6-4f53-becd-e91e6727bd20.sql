-- Add is_favorite column to enhancements table
ALTER TABLE public.enhancements 
ADD COLUMN is_favorite boolean DEFAULT false;