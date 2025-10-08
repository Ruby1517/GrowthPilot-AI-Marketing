import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function ttsFromBeats(
  beats: { narration: string }[],
  outDir: string,
  voice = "alloy"
) {
  await fs.mkdir(outDir, { recursive: true });
  const parts: string[] = [];
  for (let i = 0; i < beats.length; i++) {
    const text = beats[i].narration || "";
    const out = path.join(outDir, `vo_${i}.mp3`);
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text
    });
    await fs.writeFile(out, Buffer.from(await audio.arrayBuffer()));
    parts.push(out);
  }
  return parts;
}
