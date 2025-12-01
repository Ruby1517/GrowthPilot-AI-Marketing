import fs from "fs";
import path from "path";
import OpenAI from "openai";
import type { ClipSuggestion, ClipPlan } from "./types";

// TODO: ensure OPENAI_API_KEY is configured in your environment for clip suggestions.
const openai = new OpenAI();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_TRANSCRIBE_MODEL =
  process.env.ELEVENLABS_TRANSCRIBE_MODEL ||
  process.env.ELEVEN_TRANSCRIPTION_MODEL ||
  "scribe_v2";

export async function transcribeAudio(audioPath: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY for transcription");
  }

  const buffer = await fs.promises.readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), path.basename(audioPath) || "audio.mp3");
  form.append("model_id", ELEVENLABS_TRANSCRIBE_MODEL);
  form.append("diarization", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "accept": "application/json",
    },
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`ElevenLabs transcription failed: ${msg}`);
  }

  const data: any = await res.json().catch(() => ({}));
  const segments =
    Array.isArray(data?.segments) && data.segments.length
      ? data.segments
          .map((s: any) => s?.text || s?.transcript || "")
          .filter(Boolean)
          .join(" ")
      : null;
  const text = data?.text || data?.transcript || segments;
  if (!text) {
    const dbg = typeof data === "object" ? JSON.stringify(data) : String(data || "");
    console.warn("ElevenLabs transcription returned no text, continuing with empty transcript:", dbg.slice(0, 400));
    return "";
  }
  return text;
}

export async function suggestClipsFromTranscript(transcript: string): Promise<ClipSuggestion[]> {
  const system = "You are an expert short-form video editor. Propose viral, high-retention clips.";
  const user = [
    "Given the transcript below, propose 3-5 viral-ready clips.",
    "Respond with JSON only in the shape:",
    `[{
      "id": string,
      "startSeconds": number,
      "endSeconds": number,
      "durationSeconds": number,
      "hook": string,
      "title": string,
      "summary": string
    }]`,
    "",
    "Transcript:",
    transcript,
  ].join("\n");

  const candidates = [
    process.env.OPENAI_CLIPS_MODEL,
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-3.5-turbo",
  ].filter(Boolean) as string[];

  let raw = "[]";
  let lastErr: any;
  for (const model of candidates) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
      });
      raw = completion.choices?.[0]?.message?.content || "[]";
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      const code = err?.status || err?.code;
      if (code === 401 || code === 403) continue;
      throw err;
    }
  }

  if (lastErr) {
    throw lastErr;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ClipSuggestion[];
  } catch {
    // fall through
  }
  return [];
}

export async function autoClipFromTranscript(transcript: string, opts?: { durationSeconds?: number; targetLength?: number }) {
  const targetLen = Math.max(8, Math.min(90, opts?.targetLength ?? 30));
  const totalDuration = opts?.durationSeconds;
  const bounds = totalDuration ? ` Keep startSeconds >= 0 and endSeconds <= ${Math.floor(totalDuration)}.` : "";

  const user = [
    "Pick one short viral-worthy clip from the transcript.",
    `Aim for ${targetLen} seconds (<= 90s).${bounds}`,
    "Return JSON ONLY in this exact shape (no prose):",
    `{
      "startSeconds": number,
      "endSeconds": number,
      "hook": string,
      "title": string,
      "summary": string
    }`,
    "",
    "Transcript:",
    transcript,
  ].join("\n");

  const candidates = [
    process.env.OPENAI_CLIPS_MODEL,
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-3.5-turbo",
  ].filter(Boolean) as string[];

  let raw = "{}";
  let lastErr: any;
  for (const model of candidates) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are an expert editor. Respond with JSON only." },
          { role: "user", content: user },
        ],
        temperature: 0.35,
      });
      raw = completion.choices?.[0]?.message?.content || "{}";
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      const code = err?.status || err?.code;
      if (code === 401 || code === 403) continue;
      throw err;
    }
  }
  if (lastErr) throw lastErr;

  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch {}

  const clamp = (n: any, min: number, max: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  };

  const start = clamp(parsed.startSeconds, 0, Math.max(0, (totalDuration ?? 1) - 1));
  const end = clamp(parsed.endSeconds, start + 1, totalDuration ?? start + targetLen);
  const hook = parsed.hook || parsed.title || "Check this out";
  const title = parsed.title || "Clip";
  const summary = parsed.summary || "Auto-selected highlight";
  const durationSeconds = Math.max(1, end - start);

  return {
    id: "auto",
    startSeconds: start,
    endSeconds: end,
    durationSeconds,
    hook,
    title,
    summary,
  } satisfies ClipSuggestion;
}

export async function generateClipPlan(transcript: string): Promise<ClipPlan> {
  const candidates = [
    process.env.OPENAI_CLIP_PLAN_MODEL,
    process.env.OPENAI_CLIPS_MODEL,
    "gpt-4.1-mini",
    "gpt-4o-mini",
    "gpt-4o",
  ].filter(Boolean) as string[];

  const system =
    "You are a short-form ad video editor. Pick one 15–30 second segment from the transcript and return JSON ONLY with the requested fields.";
  const user = [
    "Transcript:",
    transcript,
    "",
    "Respond with JSON ONLY in this exact shape (no prose):",
    `{
      "startSeconds": number,
      "endSeconds": number,
      "durationSeconds": number,
      "hook": string,
      "title": string,
      "summary": string,
      "promoLabel": string,
      "ctaText": string,
      "brandTag": string
    }`,
    "Use 15–30 seconds. hook is the main headline to overlay. promoLabel is a small badge label.",
  ].join("\n");

  let raw = "{}";
  let lastErr: any;
  for (const model of candidates) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.35,
      });
      raw = completion.choices?.[0]?.message?.content || "{}";
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      const code = err?.status || err?.code;
      if (code === 401 || code === 403) continue;
      throw err;
    }
  }
  if (lastErr) throw lastErr;

  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { throw new Error("Model did not return valid JSON"); }

  const n = (v: any) => Number(v);
  const start = n(parsed.startSeconds);
  const end = n(parsed.endSeconds);
  const dur = n(parsed.durationSeconds);
  const hook = (parsed.hook || parsed.overlayText || "").toString().trim();
  const overlayText = hook || (parsed.overlayText || "").toString().trim();
  const title = (parsed.title || "").toString().trim() || "Clip";
  const summary = (parsed.summary || "").toString().trim() || "Highlight";
  const promoLabel = (parsed.promoLabel || "").toString().trim() || "LIMITED-TIME OFFER";
  const ctaText = (parsed.ctaText || "").toString().trim() || "Tap to learn more";
  const brandTag = (parsed.brandTag || "").toString().trim() || "@GrowthPilotAI";

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("Invalid start/end in clip plan");
  }
  if (!overlayText) {
    throw new Error("hook/overlayText missing in clip plan");
  }
  const durationSeconds = Number.isFinite(dur) && dur > 0 ? dur : Math.max(1, end - start);

  return {
    startSeconds: start,
    endSeconds: end,
    durationSeconds,
    hook: overlayText,
    overlayText,
    title,
    summary,
    promoLabel,
    ctaText,
    brandTag,
  };
}
