import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Lead from "@/models/Lead";
import { sendLeadEmail } from "@/lib/mailer";
import { postWebhook } from "@/lib/webhook";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const session = await auth(); // optional: allow anonymous if you want
  const body = await req.json();
  const { playbook, site, name, email, company, message, confidence, transcript } = body || {};
  await dbConnect();

  const lead = await Lead.create({
    userId: session?.user?.id ? new mongoose.Types.ObjectId((session.user as any).id) : new mongoose.Types.ObjectId(),
    site, playbook, name, email, company, message, confidence, transcript,
  });

  try { await sendLeadEmail(lead.toObject()); } catch {}
  try { await postWebhook(lead.toObject()); } catch {}

  return NextResponse.json({ id: String(lead._id) }, { status: 201 });
}
