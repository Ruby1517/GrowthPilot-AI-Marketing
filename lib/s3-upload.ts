// src/lib/s3-upload.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/lib/s3";

export async function uploadBufferToS3(buf: Buffer, key: string, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buf,
    ContentType: contentType,
    ACL: "public-read", // or keep private + return signed URL
  }));
  const CDN = process.env.CDN_URL || `https://${S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`;
  return `${CDN}/${key}`;
}
