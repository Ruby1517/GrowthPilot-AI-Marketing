import path from "path";
import { putBuffer, presignGet, guessContentType } from "@/lib/s3";

export async function uploadClipToS3(buffer: Buffer, filename: string) {
  const safeName = (filename || "clip.mp4").replace(/[^\w.\-]+/g, "_");
  const key = `clippilot/shorts/${Date.now()}-${safeName}`;
  await putBuffer(key, buffer, guessContentType(path.basename(safeName)));
  const url = await presignGet(key, 60 * 60 * 6); // 6 hours
  return { key, url };
}
