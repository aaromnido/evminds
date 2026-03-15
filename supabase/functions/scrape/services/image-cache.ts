/**
 * Service: Image caching to Supabase Storage
 * Downloads remote OG images and stores them in the og-images bucket
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Downloads and caches an image to Supabase Storage
 * @param imageUrl - Original remote image URL
 * @param articleId - Unique identifier for the article (used as filename)
 * @param supabaseClient - Supabase client with service role
 * @returns Public URL of cached image, or original URL on error
 */
export async function cacheImage(
  imageUrl: string,
  articleId: string,
  supabaseClient: SupabaseClient
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    // Download image from remote URL
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return imageUrl; // Fallback to original URL
    }

    const blob = await response.blob();

    // Extract file extension from URL or blob type
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${articleId}.${ext}`;

    // Upload to Supabase Storage with upsert (replace if exists)
    const { data, error } = await supabaseClient.storage
      .from('og-images')
      .upload(filename, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return imageUrl; // Fallback to original URL
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabaseClient.storage
      .from('og-images')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error('Image cache error:', error);
    return imageUrl; // Fallback to original URL on any error
  }
}
