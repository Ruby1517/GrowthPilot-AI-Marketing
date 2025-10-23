import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';
import { assertWithinLimit } from '@/lib/usage';
import { recordOverageRow } from '@/lib/overage';
import { track } from '@/lib/track';
import { FFPROBE_BIN } from '@/lib/ffbins';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

async function probeDurationSec(url: string): Promise<number> {
  const bin = FFPROBE_BIN || 'ffprobe';
  try {
    const { stdout } = await exec(`${bin} -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${url}"`);
    const sec = parseFloat(stdout);
    return Number.isFinite(sec) ? Math.max(1, Math.floor(sec)) : 60;
  } catch {
    return 60; // fallback 1 minute
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const job = await ClipJob.findById(params.id);
  if (!job) return new Response('Not found', { status: 404 });

  // Derive a fetchable URL from job.src
  let sourceUrl = String(job.src || '');
  if (!/^https?:\/\//i.test(sourceUrl)) {
    // use signed viewer endpoint for private assets
    sourceUrl = `/api/assets/view?key=${encodeURIComponent(sourceUrl)}`;
  }

  // Measure duration (best effort)
  const durationSec = await probeDurationSec(sourceUrl);
  const actualMinutes = Math.max(1, Math.ceil(durationSec / 60));

  // Enforce usage and record overage if needed
  const gate = await assertWithinLimit({
    orgId: String(job.orgId),
    key: 'clippilot_minutes',
    incBy: actualMinutes,
    allowOverage: true,
  });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: 'usage_limit', details: gate }, { status: 402 });
  }
  if (gate.overage && gate.overUnits) {
    try { await recordOverageRow({ orgId: String(job.orgId), key: 'clippilot_minutes', overUnits: gate.overUnits }); } catch {}
  }

  // Persist output
  await ClipOutput.deleteMany({ jobId: job._id });
  await ClipOutput.create({ jobId: job._id, index: 0, url: sourceUrl, durationSec });

  job.status = 'done';
  job.actualMinutes = actualMinutes;
  job.estimateMinutes = Math.max(job.estimateMinutes || 0, actualMinutes);
  await job.save();

  // Track KPI (watch-time)
  try { await track(String(job.orgId), String(job.userId), { module: 'clippilot', type: 'watchtime.added', meta: { minutes: actualMinutes } }); } catch {}

  return NextResponse.json({ ok: true });
}

