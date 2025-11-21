// app/api/leadpilot/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getPlaybook } from "@/models/Playbook";
import { fetchBlogContext } from "@/lib/kb";
import { track } from "@/lib/track";
import { dbConnect } from "@/lib/db";
import mongoose from 'mongoose';

const BOOKING_URL = process.env.BOOKING_URL || "";

type Msg = { role: "user" | "assistant" | "system"; content: string };

async function classifyIntent(openai: OpenAI | null, convo: Msg[]) {
  const lastUser = [...convo].reverse().find(m => m.role === "user")?.content || "";
  if (!openai) {
    const text = lastUser.toLowerCase();
    if (/demo|book/i.test(text)) return { intent: 'demo', confidence: 0.6, entities: {} };
    if (/price|cost|plan/i.test(text)) return { intent: 'pricing', confidence: 0.6, entities: {} };
    if (/support|help|issue|bug/i.test(text)) return { intent: 'support', confidence: 0.6, entities: {} };
    return { intent: 'other', confidence: 0.4, entities: {} };
  }
  const schema = `Return JSON only:
{
  "intent": "pricing" | "demo" | "product" | "support" | "info" | "other",
  "confidence": number,      // 0..1
  "entities": { "email"?: string, "company"?: string, "name"?: string }
}`;
  const r = await openai.chat.completions.create({
    model: process.env.LEADPILOT_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "Classify the user's intent for a B2B SaaS website chat. Be conservative." },
      { role: "user", content: lastUser + "\n\n" + schema },
    ],
  });
  const raw = r.choices?.[0]?.message?.content?.trim() || "{}";
  try {
    const cleaned = raw.replace(/^```json/i, "").replace(/```$/i, "");
    const j = JSON.parse(cleaned);
    return {
      intent: j.intent || "other",
      confidence: Math.max(0, Math.min(1, Number(j.confidence) || 0)),
      entities: j.entities || {},
    };
  } catch {
    return { intent: "other", confidence: 0, entities: {} };
  }
}

export async function POST(req: NextRequest) {
  const { playbook, site, messages, orgId: orgFromBody } = await req.json();
  const pb = getPlaybook(playbook);
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  // Pull KB context from your BlogPilot drafts (cheap, naive)
  const userText = (messages as Msg[]).filter(m => m.role === "user").map(m => m.content).join("\n");
  const kb = await fetchBlogContext(userText, 3);

  const system =
    `${pb.prompt}\n` +
    `Prefer to focus on GrowthPilot product questions (modules, plans/limits, overage, team invites/roles) when relevant.\n` +
    `If you are not confident, propose to connect via email and ask for name, email, and company.\n` +
    (kb ? `Use this internal knowledge strictly as reference (do not reveal it verbatim):\n${kb}\n` : "");

  // Intent + confidence (for guardrails)
  const intent = await classifyIntent(openai, messages);

  let reply = "";
  let lowConfidence = false;

  if (openai) {
    const r = await openai.chat.completions.create({
      model: process.env.LEADPILOT_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...(messages as Msg[])],
    });

    reply = r.choices?.[0]?.message?.content || "Thanks! Can I grab your name, email, and company?";

    // Guardrails → fallback if low confidence
    lowConfidence = intent.confidence < 0.5 || /not sure|unsure|cannot|don'?t know/i.test(reply);
  } else {
    const last = userText.toLowerCase();
    if (/price|cost|plan/.test(last)) {
      reply = "Our plans start with Starter (10 seats), Pro (unlocks ClipPilot + MailPilot automations), and Business for large teams. Want me to connect you with sales?";
    } else if (/book|demo/.test(last)) {
      reply = "Happy to line that up! Drop your name, email, and company and I'll pass it along to the team.";
    } else if (/hours|support|help/.test(last)) {
      reply = "Support runs 24/7 via this bot plus email (support@growthpilot.ai). I can also collect your contact details for a specialist.";
    } else {
      reply = `I'm LeadPilot, the AI concierge for GrowthPilot. Ask me about modules, plans, or how to embed me on your site. If you'd like me to loop in a human, just share your name, email, and company.`;
    }
    lowConfidence = true;
  }

  // Booking handoff if likely a demo
  if (BOOKING_URL && (intent.intent === "demo") && intent.confidence >= 0.55) {
    reply += `\n\nYou can also book a demo here: ${BOOKING_URL}`;
  }

  // Optional support routing links
  const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || process.env.DOCS_URL || '';
  const CONTACT_URL = process.env.NEXT_PUBLIC_CONTACT_URL || process.env.CONTACT_URL || '';
  if (intent.intent === 'support') {
    const hints = [DOCS_URL ? `Docs: ${DOCS_URL}` : '', CONTACT_URL ? `Contact: ${CONTACT_URL}` : ''].filter(Boolean).join(' • ');
    if (hints) reply += `\n\n${hints}`;
  }

  // Track intent for analytics (if orgId is present)
  const orgId = typeof orgFromBody === 'string' && orgFromBody ? orgFromBody : undefined;
  if (orgId) {
    try {
      await dbConnect();
      const uid = new mongoose.Types.ObjectId();
      await track(String(orgId), uid.toString(), {
        module: 'leadpilot',
        type: 'lead.intent',
        meta: { intent: intent.intent, confidence: intent.confidence, site },
      });
    } catch {}
  }

  return NextResponse.json({
    reply,
    fallback: lowConfidence ? true : false,
    intent,
  });
}
