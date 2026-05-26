/**
 * Service: Image caching to Cloudinary
 * Downloads remote OG images and uploads them to Cloudinary as signed assets.
 * On any error, falls back to the original remote URL so insertion never breaks.
 */

const CLOUDINARY_CLOUD = Deno.env.get('PUBLIC_CLOUDINARY_CLOUD');
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

async function sha1Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Downloads a remote image and uploads it to Cloudinary with a signed POST.
 * @param imageUrl - Original remote image URL
 * @param articleId - Used as the Cloudinary public_id (UUID, no extension)
 * @returns Cloudinary secure_url, or the original URL on any error
 */
export async function cacheImage(
  imageUrl: string,
  articleId: string,
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  if (!CLOUDINARY_CLOUD || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error(
      'Cloudinary env vars missing (PUBLIC_CLOUDINARY_CLOUD / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET); skipping upload',
    );
    return imageUrl;
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`Blocked non-HTTP image URL: ${imageUrl}`);
      return null;
    }
    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.') ||
      host.startsWith('169.254.') ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      console.warn(`Blocked private/internal image URL: ${imageUrl}`);
      return null;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return imageUrl;
    }
    const blob = await response.blob();

    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      format: 'webp',
      overwrite: 'true',
      public_id: articleId,
      timestamp: String(timestamp),
      transformation: 'c_limit,w_1200,q_auto',
    };

    const stringToSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const signature = await sha1Hex(stringToSign + CLOUDINARY_API_SECRET);

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);
    for (const [k, v] of Object.entries(params)) {
      formData.append(k, v);
    }

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: formData },
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error(
        `Cloudinary upload failed (${uploadRes.status}): ${errBody}`,
      );
      return imageUrl;
    }

    const result = await uploadRes.json();
    if (typeof result?.secure_url !== 'string') {
      console.error('Cloudinary response missing secure_url:', result);
      return imageUrl;
    }

    return result.secure_url;
  } catch (error) {
    console.error('Image cache error:', error);
    return imageUrl;
  }
}
