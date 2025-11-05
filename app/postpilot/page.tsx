'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

const platformsAll = ['instagram','tiktok','linkedin','x', 'facebook'] as const;
const voices = ['Friendly','Professional','Witty','Inspirational','Authoritative'] as const;

type Item = {
  platform: typeof platformsAll[number];
  caption: string;
  hashtags: string[];
  altText: string;
  suggestions: string[];
};

export default function PostPilotPage() {
  const [topic, setTopic] = useState('');
  const [voice, setVoice] = useState<typeof voices[number]>('Friendly');
  const [language, setLanguage] = useState('en-US');
  const [platforms, setPlatforms] = useState<string[]>(['instagram','x']);
  const [variants, setVariants] = useState<number>(1);
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>(''); // ISO string from datetime-local

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [usage, setUsage] = useState<{ totalTokens?: number } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  // keep card refs for PNG export
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggle = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setItems([]); setPostId(null); setUsage(null);

    try {
      if (!topic.trim()) throw new Error('Please enter a topic or brief.');
      if (!platforms.length) throw new Error('Pick at least one platform.');

      const body: any = { topic: topic.trim(), voice, language, platforms, variants };
      if (projectId) body.projectId = projectId.trim();
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

      const res = await fetch('/api/postpilot/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const json = (() => { try { return JSON.parse(text); } catch { return { ok: false, error: text }; } })();

      if (!res.ok || json.ok === false) {
        throw new Error(json?.error ? (typeof json.error === 'string' ? json.error : 'Generation failed') : 'Generation failed');
      }

      setItems(Array.isArray(json.items) ? json.items : []);
      setUsage(json.usage ?? null); // { totalTokens }
      setPostId(json.postId ?? null);

      // resize refs array to match items for PNG export
      cardRefs.current = new Array(json.items?.length || 0).fill(null);
    } catch (err: any) {
      setError(err.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  function copyText(txt: string) {
    navigator.clipboard.writeText(txt);
    alert('Copied!');
  }

  function exportCSV() {
    const header = 'platform,hashtags,altText,caption\n';
    const rows = items.map((v) =>
      [
        v.platform,
        (v.hashtags || []).map((h: string) => `#${h}`).join(' '),
        (v.altText || '').replace(/\n/g, ' '),
        (v.caption || '').replace(/\n/g, ' '),
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `postpilot${postId ? `_${postId}` : ''}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG(idx: number) {
    const el = cardRefs.current[idx];
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0b0b0b', scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `postpilot_${postId || 'preview'}_${idx + 1}.png`;
    a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="card p-6 max-w-3xl">
        <h1 className="text-2xl font-semibold">PostPilot — AI Social Content</h1>
        <form onSubmit={onGenerate} className="mt-4 space-y-4">
          <textarea
            className="w-full rounded-md border p-3"
            placeholder="Topic / brief / URL…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as any)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              >
                {voices.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Language</label>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="en-US"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Project</label>
              <input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="(optional) projectId"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Schedule</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Variants</label>
              <input
                type="number"
                min={1}
                max={10}
                value={variants}
                onChange={(e) => setVariants(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-28 rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Platforms:</span>
            {platformsAll.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggle(p)}
                className={`px-3 py-1.5 rounded-xl text-sm border ${
                  platforms.includes(p) ? 'border-white/20' : 'border-white/10 text-brand-muted'
                }`}
              >
                {p}
              </button>
            ))}
            <div className="ml-auto">
              <button className="btn-gold" disabled={loading}>
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {!!usage?.totalTokens && (
            <p className="text-xs text-brand-muted">
              Tokens used (total): {usage.totalTokens.toLocaleString()}
            </p>
          )}
        </form>
      </div>

      {!!items.length && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Variants <span className="text-brand-muted text-sm">({items.length})</span>
            </h2>
            <button className="btn-gold" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items.map((v, i) => (
              <div
                key={`${v.platform}-${i}`}
                ref={(el) => (cardRefs.current[i] = el)}
                className="card p-4 space-y-2 w-full md:w-[520px]"
              >
                <div className="text-xs uppercase tracking-wide text-brand-muted">{v.platform}</div>
                <pre className="whitespace-pre-wrap text-sm">{v.caption}</pre>
                {!!v.hashtags?.length && (
                  <div className="text-sm opacity-80">
                    {v.hashtags.map((h: string) => `#${h}`).join(' ')}
                  </div>
                )}
                {!!v.altText && (
                  <div className="text-xs text-brand-muted">Alt text: {v.altText}</div>
                )}
                {!!v.suggestions?.length && (
                  <div className="text-xs text-brand-muted">Ideas: {v.suggestions.join(' • ')}</div>
                )}
                <div className="flex gap-2">
                  <button className="btn-gold" onClick={() => copyText(v.caption)}>Copy</button>
                  <button className="btn-gold" onClick={() => exportPNG(i)}>Export PNG</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
