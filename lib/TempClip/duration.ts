import { parseBuffer } from 'music-metadata';

export async function durationFromMp3Buffer(buf: Buffer) {
  const { format } = await parseBuffer(buf);
  const sec = Number(format.duration ?? 0);
  return Math.max(1, Math.floor(sec || 0));
}
