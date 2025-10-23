export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ViralProject from '@/models/ViralProject';
import Asset from '@/models/Asset';
import { s3 } from '@/lib/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { durationFromMp3Buffer } from '@/lib/clipPilot/duration';
import User from '@/models/User';
import { limiterPerOrg } from '@/lib/ratelimit';
import { retryFetch } from '@/lib/http';

const REGION = process.env.AWS_REGION || 'us-west-1';
const BUCKET = process.env.S3_BUCKET!;

function scriptToPlainText(doc: any) {
  const parts = (doc.script?.sections || []).map((s: any) => `${s.title}\n${s.text}`);
  if (doc.script?.cta) parts.push(`Call to Action: ${doc.script.cta}`);
  return parts.join('\n\n');
}

function resolveVoiceId(voice?: string, explicitId?: string) {
  if (explicitId && typeof explicitId === 'string') return explicitId;
  const v = String(voice || '').toLowerCase();
  if (v === 'male') return process.env.ELEVENLABS_VOICE_ID_MALE || process.env.ELEVENLABS_VOICE_ID;
  if (v === 'female') return process.env.ELEVENLABS_VOICE_ID_FEMALE || process.env.ELEVENLABS_VOICE_ID;
  // 'neutral' or 'alloy' or unknown → default
  return process.env.ELEVENLABS_VOICE_ID;
}

async function ttsWithEleven(text: string, voiceId?: string) {
  const VID = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  const r = await retryFetch(`https://api.elevenlabs.io/v1/text-to-speech/${VID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.4, similarity_boost: 0.7 },
    }),
  }, { retries: 2, backoffMs: 600 });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`ElevenLabs ${r.status} ${errText}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  return buf;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, voiceId, voice } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY missing. Add it to .env.local' }, { status: 400 });
  }

  await dbConnect();
  const doc = await ViralProject.findById(id);
  if (!doc?.script?.sections?.length) return NextResponse.json({ error: 'No script' }, { status: 400 });

  // Optional rate limit per org (if Upstash configured)
  try {
    const me = await User.findOne({ email: (session.user as any).email }).lean().catch(()=>null);
    const orgId = me?.orgId ? String(me.orgId) : null;
    if (orgId && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { success } = await limiterPerOrg.limit(orgId);
      if (!success) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  } catch {}

  const text = scriptToPlainText(doc);
  const resolvedVoiceId = resolveVoiceId(voice, voiceId);
  const mp3 = await ttsWithEleven(text, resolvedVoiceId);
  const durSec = await durationFromMp3Buffer(mp3).catch(()=>0);

  // Upload to S3
  const key = `assets/user_${(session.user as any).id}/viralp/${doc._id}/voiceover.mp3`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: mp3, ContentType: 'audio/mpeg',
  }));
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });

  await Asset.create({
    userId: (session.user as any).id,
    key, bucket: BUCKET, region: REGION,
    contentType: 'audio/mpeg', size: mp3.length, status: 'ready', type: 'audio',
  });

  doc.tts = { key, bucket: BUCKET, region: REGION, url, durationSec: durSec } as any;
  if (voice) (doc as any).voice = voice;
  doc.status = 'tts-ready';
  await doc.save();

  return NextResponse.json({ doc });
}
