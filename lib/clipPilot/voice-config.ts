export type VoicePersona = "female" | "male" | "kid";
export type VoiceStyle = "friendly" | "energetic" | "advertising" | "motivational";

export type VoiceOption = {
  id: string;
  label: string;
  persona: VoicePersona;
  defaultStyle: VoiceStyle;
  sampleText: string;
};

export const DEFAULT_VOICE_ID =
  process.env.SARA_VOICE_ID ||
  process.env.CHLOE_VOICE_ID ||
  process.env.HALEY_VOICE_ID ||
  process.env.ADAM_VOICE_ID ||
  process.env.DAVID_VOICE_ID ||
  process.env.PARKER_VOICE_ID ||
  "";

export const VOICE_PRESETS: Record<VoicePersona, string> = {
  female:
    process.env.CHLOE_VOICE_ID ||
    process.env.SARA_VOICE_ID ||
    process.env.HALEY_VOICE_ID ||
    DEFAULT_VOICE_ID,
  male:
    process.env.ADAM_VOICE_ID ||
    process.env.DAVID_VOICE_ID ||
    process.env.PARKER_VOICE_ID ||
    DEFAULT_VOICE_ID,
  kid:
    process.env.CHLOE_VOICE_ID ||
    process.env.SARA_VOICE_ID ||
    process.env.HALEY_VOICE_ID ||
    DEFAULT_VOICE_ID,
};

const STYLE_SETTINGS: Record<VoiceStyle, { stability: number; similarity_boost: number; style: number; voiceGainDb: number; musicGainDb: number; eqVoice?: string; eqMusic?: string }> = {
  friendly: { stability: 0.55, similarity_boost: 0.8, style: 0.4, voiceGainDb: 2, musicGainDb: -6, eqVoice: "equalizer=f=1200:t=h:width=2000:g=2" },
  energetic: { stability: 0.35, similarity_boost: 0.75, style: 0.9, voiceGainDb: 3, musicGainDb: -4, eqVoice: "equalizer=f=3000:t=h:width=2400:g=3" },
  advertising: { stability: 0.45, similarity_boost: 0.7, style: 0.75, voiceGainDb: 2.5, musicGainDb: -5, eqVoice: "equalizer=f=2500:t=h:width=2200:g=2.5" },
  motivational: { stability: 0.45, similarity_boost: 0.8, style: 0.85, voiceGainDb: 3, musicGainDb: -5, eqVoice: "equalizer=f=2800:t=h:width=2200:g=3" },
};

const CATEGORY_STYLE_MAP: Record<string, VoiceStyle> = {
  fitness: "motivational",
  health: "motivational",
  sports: "energetic",
  lifestyle: "friendly",
  education: "friendly",
  tutorial: "friendly",
  ecommerce: "advertising",
  retail: "advertising",
  finance: "advertising",
  saas: "advertising",
};

const EXTRA_VOICES: (VoiceOption | null)[] = [
  process.env.SARA_VOICE_ID
    ? {
        id: process.env.SARA_VOICE_ID,
        label: "Sara — Entertainment & TV",
        persona: "female" as VoicePersona,
        defaultStyle: "energetic" as VoiceStyle,
        sampleText: "Ready? Let's make this moment binge-worthy.",
      }
    : null,
  process.env.ADAM_VOICE_ID
    ? {
        id: process.env.ADAM_VOICE_ID,
        label: "Adam — Narrative & Story (Male)",
        persona: "male" as VoicePersona,
        defaultStyle: "friendly" as VoiceStyle,
        sampleText: "Let me share the story in just a few lines.",
      }
    : null,
  process.env.CHLOE_VOICE_ID
    ? {
        id: process.env.CHLOE_VOICE_ID,
        label: "Chloe — Narrative & Story (Female)",
        persona: "female" as VoicePersona,
        defaultStyle: "friendly" as VoiceStyle,
        sampleText: "Here's the hook—lean in for the details.",
      }
    : null,
  process.env.HALEY_VOICE_ID
    ? {
        id: process.env.HALEY_VOICE_ID,
        label: "Haley — Social Media",
        persona: "female" as VoicePersona,
        defaultStyle: "energetic" as VoiceStyle,
        sampleText: "Wait till you see this part—it's wild!",
      }
    : null,
  process.env.DAVID_VOICE_ID
    ? {
        id: process.env.DAVID_VOICE_ID,
        label: "David — Informative & Educational",
        persona: "male" as VoicePersona,
        defaultStyle: "friendly" as VoiceStyle,
        sampleText: "Here's a quick breakdown so you can act fast.",
      }
    : null,
  process.env.PARKER_VOICE_ID
    ? {
        id: process.env.PARKER_VOICE_ID,
        label: "Parker — Advertising",
        persona: "male" as VoicePersona,
        defaultStyle: "advertising" as VoiceStyle,
        sampleText: "Limited-time offer—tap now to unlock it.",
      }
    : null,
].filter(Boolean);

export const VOICE_OPTIONS: VoiceOption[] = [
  VOICE_PRESETS.female
    ? {
        id: VOICE_PRESETS.female,
        label: "Ava — Female (American)",
        persona: "female",
        defaultStyle: "friendly",
        sampleText: "Here's the hook: let's make this your best-performing short yet.",
      }
    : null,
  VOICE_PRESETS.male
    ? {
        id: VOICE_PRESETS.male,
        label: "Blake — Male (American)",
        persona: "male",
        defaultStyle: "advertising",
        sampleText: "Limited-time offer. Tap now before this deal disappears.",
      }
    : null,
  VOICE_PRESETS.kid
    ? {
        id: VOICE_PRESETS.kid,
        label: "Sky — Youthful (American)",
        persona: "kid",
        defaultStyle: "energetic",
        sampleText: "Whoa, you’ve gotta see this part—it's epic!",
      }
    : null,
  ...EXTRA_VOICES,
].filter(Boolean) as VoiceOption[];

export function pickStyleFromCategory(category?: string | null): VoiceStyle | null {
  if (!category) return null;
  const key = category.toLowerCase();
  return CATEGORY_STYLE_MAP[key] || null;
}

export function getStyleSettings(style: VoiceStyle) {
  return STYLE_SETTINGS[style] || STYLE_SETTINGS.friendly;
}
