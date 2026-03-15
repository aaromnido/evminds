-- Migration 4: Configure Storage policies for og-images bucket
-- Allow public read access and service role write access

-- Policy 1: Allow anyone to read images (public access)
CREATE POLICY "Public read access on og-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'og-images');

-- Policy 2: Allow service role to upload images (from Edge Function)
CREATE POLICY "Service role can insert og-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'og-images'
  AND auth.role() = 'service_role'
);

-- Policy 3: Allow service role to update images (upsert in cache)
CREATE POLICY "Service role can update og-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'og-images'
  AND auth.role() = 'service_role'
);

-- Verify policies
SELECT * FROM storage.policies WHERE bucket_id = 'og-images';
