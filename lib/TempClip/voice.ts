import {
  DEFAULT_VOICE_ID,
  VOICE_PRESETS,
  VOICE_OPTIONS,
  pickStyleFromCategory,
  getStyleSettings,
  type VoicePersona,
  type VoiceStyle,
  type VoiceOption,
} from "./voice-config";

let openaiInstance: any = null;
async function getOpenAI() {
  if (openaiInstance) return openaiInstance;
  const { default: OpenAI } = await import("openai");
  openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiInstance;
}

function describeVoice(persona: VoicePersona, style: VoiceStyle) {
  const personaLabel = persona === "kid" ? "kid" : `${persona} adult`;
  return `${style}, ${personaLabel} American narrator`;
}

export { VOICE_OPTIONS, pickStyleFromCategory, getStyleSettings };
export type { VoicePersona, VoiceStyle, VoiceOption };

/**
 * Generate a short voice-over script (6–10 seconds) to promote the clip.
 * Tone defaults to energetic, motivational, friendly, female American narrator,
 * but can be customized via persona + style.
 */
export async function generateVoiceScript(
  summary: string,
  transcript: string,
  opts?: { persona?: VoicePersona; style?: VoiceStyle; category?: string }
): Promise<string> {
  const persona: VoicePersona = opts?.persona ?? "female";
  const style: VoiceStyle = opts?.style ?? pickStyleFromCategory(opts?.category) ?? "friendly";
  const openai = await getOpenAI();
  const system =
    `You are a short-form video narrator. Write 1-2 sentences (6-10 seconds max) to promote this clip as an ad/hook. Tone: ${describeVoice(persona, style)}. Keep the accent American. Respond with the spoken script only, no JSON, no quotes.`;

  const user = [
    "Summary:",
    summary || "(none)",
    "",
    "Transcript:",
    transcript || "(none)",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
  });

  const text = completion.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Voice script generation returned empty text");
  return text;
}

/**
 * Synthesize voice-over using ElevenLabs TTS.
 */
export async function synthesizeVoice(
  voiceText: string,
  opts?: { persona?: VoicePersona; style?: VoiceStyle; voiceId?: string; category?: string }
): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  if (!voiceText || voiceText.trim().length < 5) {
    throw new Error("Voice text is too short for TTS");
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const persona: VoicePersona = opts?.persona ?? "female";
  const style: VoiceStyle = opts?.style ?? pickStyleFromCategory(opts?.category) ?? "friendly";
  const voice_id = opts?.voiceId || VOICE_PRESETS[persona] || DEFAULT_VOICE_ID;
  if (!voice_id) {
    throw new Error("No ElevenLabs voice id configured. Set one of your specific voice envs.");
  }
  const model_id = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";
  const voiceSettings = getStyleSettings(style);

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model_id,
      text: voiceText,
      voice_settings: {
        ...voiceSettings,
        use_speaker_boost: true,
      },
    }),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    console.error("ElevenLabs TTS error:", msg);
    throw new Error(`ElevenLabs TTS failed: ${msg}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const voicePath = path.join("/tmp", `clippilot-voice-${Date.now()}.mp3`);
  await fs.promises.writeFile(voicePath, buffer);
  return voicePath;
}
