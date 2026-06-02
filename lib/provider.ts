import OpenAI from "openai";

// --- ENV ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// --- Types ---
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type TextOptions = {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  json?: boolean;     // request JSON object response_format
};

export type TextResult = { text: string; tokens: number; raw?: any };

export type ImageOptions = {
  prompt: string;
  model: string;      // e.g., 'gpt-image-1'
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  n?: number;         // number of images
  quality?: 'standard' | 'hd';
};

export type ImageResult = {
  // base64 strings inlined to keep it provider-agnostic
  images: Array<{ b64: string }>;
};

export type EmbeddingOptions = {
  input: string | string[];
  model: string;      // e.g., 'text-embedding-3-large'
};
export type EmbeddingResult = { vectors: number[][] };

export type ModerationOptions = { input: string; model: string };
export type ModerationResult = { flagged: boolean; categories?: any; raw?: any };


// --- utils ---
function estimateTokens(str: string) { return Math.ceil((str?.length || 0) / 4); }
function toMessages(msgs: ChatMessage[]) {
  const hasSystem = msgs.some(m => m.role === 'system');
  return hasSystem ? msgs : [{ role: 'system', content: 'You are a helpful assistant.' }, ...msgs];
}
// --- TEXT ---
export async function callText(opts: TextOptions): Promise<TextResult> {
  if (!OPENAI_API_KEY || process.env.MOCK_PROVIDER === 'true') {
    const mock = opts.json ? JSON.stringify({ mock: true }) : "Mock text.";
    return { text: mock, tokens: estimateTokens(mock) };
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const response_format = opts.json ? ({ type: "json_object" } as any) : undefined;

  const completion = await openai.chat.completions.create({
    model: opts.model,
    // Some OpenAI routing models only allow default temperature; omit when unset
    ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
    response_format,
    messages: toMessages(opts.messages) as any,
  });

  const text = completion.choices?.[0]?.message?.content ?? "";
  const tokens =
    (completion.usage?.prompt_tokens || 0) +
    (completion.usage?.completion_tokens || 0) ||
    estimateTokens(text);

  return { text, tokens, raw: completion };
}

// --- IMAGE ---
export async function callImage(opts: ImageOptions): Promise<ImageResult> {
  if (!OPENAI_API_KEY || process.env.MOCK_PROVIDER === 'true') {
    return { images: [{ b64: "" }] };
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const r = await openai.images.generate({
    model: opts.model,
    prompt: opts.prompt,
    n: opts.n ?? 1,
    size: opts.size ?? '1024x1024',
    quality: opts.quality ?? 'high',
    // You can add background: 'transparent' when supported for logos
  } as any);

  // SDK returns base64 in r.data[].b64_json
  const images = (r.data || []).map((d: any) => ({ b64: d.b64_json as string }));
  return { images };
}

// --- EMBEDDINGS ---
export async function callEmbedding(opts: EmbeddingOptions): Promise<EmbeddingResult> {
  if (!OPENAI_API_KEY || process.env.MOCK_PROVIDER === 'true') {
    const dummy = Array.isArray(opts.input) ? opts.input.length : 1;
    return { vectors: Array(dummy).fill(0).map(() => [0.01, 0.02, 0.03]) };
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const r = await openai.embeddings.create({
    model: opts.model,
    input: opts.input,
  });
  const vectors = r.data.map((d: any) => d.embedding as number[]);
  return { vectors };
}

// --- MODERATION ---
export async function callModeration(opts: ModerationOptions): Promise<ModerationResult> {
  if (!OPENAI_API_KEY || process.env.MOCK_PROVIDER === 'true') {
    return { flagged: false };
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const r = await openai.moderations.create({
    model: opts.model,
    input: opts.input,
  } as any);
  // Normalise: OpenAI returns results[0]
  const res = (r as any).results?.[0] || {};
  return { flagged: !!res.flagged, categories: res.categories, raw: r };
}

