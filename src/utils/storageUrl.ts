/**
 * Storage URL helpers
 *
 * After privatizing certain buckets, getPublicUrl() returns URLs that 401.
 * Existing rows store the old public URL format:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *
 * resolveStorageUrl() detects those URLs (or accepts a bucket+path) and
 * returns a short-lived signed URL for private buckets. Public buckets
 * pass through unchanged.
 */

import { supabase } from '@/integrations/supabase/client';

const PRIVATE_BUCKETS = new Set([
  'claim-receipts',
  'payment-proofs',
  'receipts',
  'student-photos',
  'notice-attachments',
]);

const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

interface ParsedUrl {
  bucket: string;
  path: string;
}

const BARE_PATH_PREFIX_TO_BUCKET: Record<string, string> = {
  'public-grading/': 'payment-proofs',
  'public-competition/': 'payment-proofs',
  'public-guards/': 'payment-proofs',
  'competition/': 'payment-proofs',
};

const parseStoragePath = (urlOrPath: string): ParsedUrl | null => {
  if (!urlOrPath) return null;

  // Public-format URL — strip query/hash before treating as path
  const publicMatch = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/([^?#]+)/);
  if (publicMatch) {
    return { bucket: publicMatch[1], path: decodeURIComponent(publicMatch[2]) };
  }

  // Already a signed URL — leave it
  if (urlOrPath.includes('/storage/v1/object/sign/')) {
    return null;
  }

  // Bare path uploaded by public submission flows (no scheme, no leading slash)
  if (!/^https?:\/\//i.test(urlOrPath) && !urlOrPath.startsWith('/')) {
    for (const [prefix, bucket] of Object.entries(BARE_PATH_PREFIX_TO_BUCKET)) {
      if (urlOrPath.startsWith(prefix)) {
        return { bucket, path: urlOrPath };
      }
    }
  }

  return null;
};

/**
 * Resolve a stored URL to one that the current authenticated user can fetch.
 * For private buckets this returns a signed URL; otherwise the URL is returned
 * as-is. Returns null on failure.
 */
export const resolveStorageUrl = async (
  storedUrl: string | null | undefined,
): Promise<string | null> => {
  if (!storedUrl) return null;

  const parsed = parseStoragePath(storedUrl);
  if (!parsed) return storedUrl;

  if (!PRIVATE_BUCKETS.has(parsed.bucket)) return storedUrl;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
};

/**
 * Resolve via explicit bucket + path (for callers that have the path directly).
 */
export const getSignedStorageUrl = async (
  bucket: string,
  path: string,
  ttlSeconds: number = SIGNED_TTL_SECONDS,
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

export const isPrivateBucketUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const parsed = parseStoragePath(url);
  return !!parsed && PRIVATE_BUCKETS.has(parsed.bucket);
};
