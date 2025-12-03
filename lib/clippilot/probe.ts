import { exec as _exec } from 'child_process';
import { promisify } from 'util';
import { FFPROBE_BIN } from '@/lib/ffbins';
const exec = promisify(_exec);

export async function probeDurationSeconds(filePath: string) {
  const cmd = `"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  const out = await exec(cmd);
  const sec = parseFloat(out.stdout);
  return Math.max(1, Math.floor(Number.isFinite(sec) ? sec : 0));
}
