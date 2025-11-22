export async function synthesizeTTS(text: string, voiceStyle: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = process.env.ELEVENLABS_VOICE_ID!;
  if (!apiKey || !voiceId) throw new Error("TTS not configured");

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5 }, // basic knobs
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs failed: ${res.status} ${body}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf); // MP3
}
