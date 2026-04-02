-- Make the property-photos bucket public so images don't require signed URLs that expire
UPDATE storage.buckets SET public = true WHERE id = 'property-photos';