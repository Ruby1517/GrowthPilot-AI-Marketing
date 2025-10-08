// app/api/clippilot/complete/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import Clip from '@/models/Clip';
import Org from '@/models/Org';
import { reportUsageForOrg } from '@/lib/billing/usage';
import { trackEvent } from '@/lib/events';
import { recordOverageRow } from '@/lib/overage';
import { PLAN_LIMITS } from '@/lib/limits';
import { assertWithinLimit } from '@/lib/usage';

const Body = z.object({
  jobId: z.string().min(8),
  outputs: z.array(z.object({
    url: z.string().url(),
    thumb: z.string().url().optional(),
    bytes: z.number().int().nonnegative().optional(),
  })).min(1),
  // actual total duration of rendered outputs (seconds)
  totalDurationSec: z.number().min(1),
});

const METER_KEY = 'clippilot_minutes' as const;

export async function POST(req: Request) {
  // ⛑️ You probably want a signer/secret here to protect this endpoint
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: body.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const job = await Clip.findById(body.data.jobId);
  if (!job) return new Response('Job not found', { status: 404 });

  const org = await Org.findById(job.orgId);
  if (!org) return new Response('Org not found', { status: 404 });

  // compute actual minutes
  const actualMinutes = Math.max(1, Math.ceil(body.data.totalDurationSec / 60));

  // finalize job
  job.status = 'done';
  job.outputs = body.data.outputs as any;
  job.actualMinutes = actualMinutes;
  await job.save();

  // precise metering to Stripe (minutes)
  await reportUsageForOrg(String(org._id), {
    minutes: actualMinutes,
    sourceId: String(job._id), // idempotent
  });

  // analytics
  await trackEvent({
    orgId: String(org._id),
    module: 'clippilot',
    type: 'render.completed',
    meta: { actualMinutes, estimateMinutes: job.estimateMinutes },
  });

  // If earlier we reserved estimateMinutes, you can reconcile differences.
  // If you didn't pre-increment usage with estimate, you can enforce again here:
  const gate = await assertWithinLimit({
    orgId: String(org._id),
    key: METER_KEY,
    incBy: 0,             // already incremented earlier; or set to delta if reconciling
    allowOverage: true,
  });

  // billable overage row if they exceeded plan (assertWithinLimit flagged earlier),
  // or create one now if your usage is strictly "actual" only.
  if (gate.ok && gate.overage && gate.overUnits! > 0) {
    await recordOverageRow({
      orgId: String(org._id),
      key: METER_KEY,
      overUnits: gate.overUnits!,
    });
  }

  return NextResponse.json({ ok: true });
}
