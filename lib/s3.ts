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
export async function presignGet(
  key: string,
  expiresInSec = 3600,
  opts?: { bucket?: string; region?: string }
): Promise<string> {
  const bucket = opts?.bucket || S3_BUCKET;
  const region = opts?.region || S3_REGION;

  // Re-use the default client when targeting the primary bucket/region.
  const client =
    bucket === S3_BUCKET && region === S3_REGION
      ? s3
      : new S3Client({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSec });
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
  const safeName = opts.filename.replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const id = cryptoRandomUUID();
  const folder = opts.kind || 'file';
  return `assets/user_${opts.userId}${opts.projectId ? `/proj_${opts.projectId}` : ''}/${date}/${folder}/${id}_${safeName}`;
}

// tiny polyfill for Node < 19
function cryptoRandomUUID() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

export function guessContentType(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.mp4')) return 'video/mp4';
  if (n.endsWith('.mov')) return 'video/quicktime';
  if (n.endsWith('.webm')) return 'video/webm';
  if (n.endsWith('.mkv')) return 'video/x-matroska';
  if (n.endsWith('.mp3')) return 'audio/mpeg';
  if (n.endsWith('.wav')) return 'audio/wav';
  if (n.endsWith('.m4a')) return 'audio/mp4';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}
