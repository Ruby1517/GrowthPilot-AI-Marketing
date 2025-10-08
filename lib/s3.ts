import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_REGION = process.env.AWS_REGION || 'us-west-1';
export const CDN_URL = process.env.CDN_URL || ''; // optional public CDN base

if (!S3_BUCKET) {
  throw new Error('S3_BUCKET env var is required');
}
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars are required');
}

export const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a Buffer to S3 (private by default).
 */
export async function putBuffer(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // ACL: 'private' // default; omit unless you truly need 'public-read'
    }),
  );
}

/**
 * Create a presigned GET URL (seconds to expire).
 */
export async function presignGet(key: string, expiresInSec = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSec });
}

/**
 * If you have a public CDN (e.g. CloudFront) or the bucket is public,
 * build a public URL; otherwise use the provided signed URL.
 */
export function publicUrlOrSigned(key: string, signedUrl: string): string {
  if (CDN_URL) {
    // Ensure no double slashes
    const base = CDN_URL.replace(/\/+$/, '');
    const path = key.replace(/^\/+/, '');
    return `${base}/${path}`;
  }
  // Fall back to a presigned URL
  return signedUrl;
}

/**
 * Helper: build a key with your existing convention
 * (optional – keep if you find it handy)
 */
export function buildObjectKey(opts: {
  userId: string;
  projectId?: string;
  filename: string;
  kind?: 'image' | 'video' | 'audio' | 'doc' | 'brand';
}) {
  const ext = (opts.filename.split('.').pop() || '').toLowerCase();
  const safeName = opts.filename.replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const id = cryptoRandomUUID();
  const folder = opts.kind || 'file';
  return `assets/user_${opts.userId}${opts.projectId ? `/proj_${opts.projectId}` : ''}/${date}/${folder}/${id}_${safeName}`;
}

// tiny polyfill for Node < 19
function cryptoRandomUUID() {
  // @ts-ignore
  return globalThis.crypto?.randomUUID
    ? // @ts-ignore
      globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}
