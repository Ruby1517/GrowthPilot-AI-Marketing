import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI();

/**
 * Generate a short voice-over script (6–10 seconds) to promote the clip.
 * Tone: energetic, motivational, friendly, female American narrator.
 */
export async function generateVoiceScript(summary: string, transcript: string): Promise<string> {
  const system =
    "You are a short-form video narrator. Write 1-2 sentences (6-10 seconds max) to promote this clip as an ad/hook. Tone: energetic, motivational, friendly, female American narrator. Respond with the spoken script only, no JSON, no quotes.";

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
export async function synthesizeVoice(voiceText: string): Promise<string> {
  if (!voiceText || voiceText.trim().length < 5) {
    throw new Error("Voice text is too short for TTS");
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  // TODO: change voice_id to your preferred female American voice (e.g., "Rachel" or "Bella")
  const voice_id = process.env.ELEVENLABS_VOICE_ID || "Rachel";
  const model_id = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";

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
        stability: 0.4,
        similarity_boost: 0.7,
        style: 0.8, // energetic / influencer-style
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
