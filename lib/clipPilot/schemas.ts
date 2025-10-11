// src/lib/clipPilot/schemas.ts
import { z } from "zod";

export const CreateClipSchema = z.object({
  mode: z.enum(["long_to_shorts", "tts"]), // ✅ allow "tts"
  script: z.string().min(10, "Script is too short").optional(), // required for tts (checked below)
  aspect: z.enum(["9:16","1:1","16:9"]).default("9:16"),
  variants: z.number().min(1).max(5).default(1),
  voiceStyle: z.string().default("Friendly"),
});
export type CreateClipInput = z.infer<typeof CreateClipSchema>;
