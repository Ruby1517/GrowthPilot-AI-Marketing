import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Lead from "@/models/Lead";
import { sendLeadEmail } from "@/lib/mailer";
import { postWebhook } from "@/lib/webhook";
import mongoose from "mongoose";
import { assertWithinLimit } from "@/lib/usage";
import { recordOverageRow } from "@/lib/overage";
import { track } from "@/lib/track";

export async function POST(req: NextRequest) {
  const session = await auth(); // allow anonymous: org can be passed in body
  const body = await req.json();
  const { playbook, site, name, email, company, message, confidence, transcript } = body || {};
  await dbConnect();

  // Resolve orgId for analytics/limits: prefer session user’s org, else explicit body.orgId
  let orgId: string | null = null;
  try {
    if (session?.user?.email) {
      const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
      if (me?.orgId) orgId = String(me.orgId);
    }
    if (!orgId && body?.orgId) orgId = String(body.orgId);
  } catch {}

  // Enforce plan usage on capture (1 conversation)
  let overUnits = 0;
  if (orgId) {
    const gate = await assertWithinLimit({ orgId, key: 'leadpilot_convos', incBy: 1, allowOverage: true });
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: 'Plan limit reached', details: gate }, { status: 402 });
    }
    if (gate.overage && gate.overUnits) overUnits = gate.overUnits;
  }

  const lead = await Lead.create({
    userId: session?.user?.id ? new mongoose.Types.ObjectId((session.user as any).id) : new mongoose.Types.ObjectId(),
    orgId: orgId ? new mongoose.Types.ObjectId(orgId) : undefined,
    site, playbook, name, email, company, message, confidence, transcript,
  });

  // Track analytics (KPI: leadsCaptured)
  if (orgId) {
    try {
      await track(orgId, (session?.user as any)?.id || String(lead.userId), {
        module: 'leadpilot',
        type: 'lead.captured',
        meta: { site, playbook },
      });
    } catch {}
  }

  // Record overage for invoicing if applicable
  if (orgId && overUnits > 0) {
    try { await recordOverageRow({ orgId, key: 'leadpilot_convos', overUnits }); } catch {}
  }

  try { await sendLeadEmail(lead.toObject()); } catch {}
  try { await postWebhook(lead.toObject()); } catch {}

  return NextResponse.json({ id: String(lead._id), ok: true }, { status: 201 });
}
