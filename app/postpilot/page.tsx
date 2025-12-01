'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

const platformsAll = ['instagram','tiktok','linkedin','x', 'facebook'] as const;
const voices = ['Friendly','Professional','Witty','Inspirational','Authoritative'] as const;
const languageOptions = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'Spanish', value: 'es-ES' },
  { label: 'Persian', value: 'fa-IR' },
  { label: 'Arabic', value: 'ar-SA' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'French', value: 'fr-FR' },
  { label: 'German', value: 'de-DE' },
];
const cadences = ['none','daily','weekly'] as const;

type Item = {
  platform: typeof platformsAll[number];
  headline: string;
  caption: string;
  hashtags: string[];
  altText: string;
  visualIdeas: string[];
  visualPrompt: string;
  scheduledFor?: string | null;
  imageDataUrl?: string | null;
};

export default function PostPilotPage() {
  const [topic, setTopic] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [voice, setVoice] = useState<typeof voices[number]>('Friendly');
  const [language, setLanguage] = useState('en-US');
  const [offers, setOffers] = useState('');
  const [audience, setAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram','x']);
  const [variants, setVariants] = useState<number>(1);
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>(''); // ISO string from datetime-local
  const [automationCadence, setAutomationCadence] = useState<typeof cadences[number]>('none');
  const [automationSlots, setAutomationSlots] = useState<number>(3);
  const [automationStart, setAutomationStart] = useState<string>(() => {
    // default to today's local date (avoid UTC offset issues)
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return localMidnight.toISOString().slice(0, 10);
  });
  const [includeImages, setIncludeImages] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [usage, setUsage] = useState<{ totalTokens?: number } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [automationPlan, setAutomationPlan] = useState<string[]>([]);

  // keep card refs for PNG export
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggle = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setItems([]); setPostId(null); setUsage(null); setAutomationPlan([]);

    try {
      const automationStartIso = (() => {
        if (automationCadence === 'none' || !automationStart) return undefined;
        const parsed = new Date(automationStart);
        if (isNaN(parsed.getTime())) throw new Error('Pick a valid start date.');
        return parsed.toISOString();
      })();

      if (!topic.trim() && !sourceUrl.trim()) throw new Error('Enter a topic/brief or paste a website URL.');
      if (!industry.trim()) throw new Error('Please provide your industry.');
      if (!platforms.length) throw new Error('Pick at least one platform.');

      const body: any = {
        topic: topic.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        industry: industry.trim(),
        offers: offers.trim() || undefined,
        audience: audience.trim() || undefined,
        voice,
        language,
        platforms,
        variants,
        automationCadence,
        automationSlots,
        automationStart: automationStartIso,
        includeImages,
      };
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
      setAutomationPlan(Array.isArray(json.automationPlan) ? json.automationPlan : []);

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

  function exportCSVForItem(item: Item, index: number) {
    const header = 'platform,scheduledFor,headline,hashtags,altText,caption\n';
    const row = [
      item.platform,
      item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : '',
      item.headline,
      (item.hashtags || []).map((h: string) => `#${h}`).join(' '),
      (item.altText || '').replace(/\n/g, ' '),
      (item.caption || '').replace(/\n/g, ' '),
    ]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(',');
    const blob = new Blob([header + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `postpilot_variant_${index + 1}.csv`; a.click();
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

  function downloadImage(dataUrl: string, name: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${name}.png`;
    a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="card p-6 max-w-3xl space-y-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">PostPilot — Create Smarter</h1>
          <p className="text-sm text-brand-muted mt-2">
            Stop spending hours on social content. Type what your business does and boom — captions, hashtags, CTAs,
            and brand-ready visuals appear. Generate full campaigns (a week or even 30 days) in any language.
            GrowthPilot designs the images too, so you can launch faster.
          </p>
        </div>
        <form onSubmit={onGenerate} className="mt-4 space-y-4">
          <input
            className="w-full rounded-md border p-3 text-sm"
            placeholder="Website URL (auto-scan) — optional"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            type="url"
          />
          <textarea
            className="w-full rounded-md border p-3"
            placeholder="Topic / brief (optional if URL provided)…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
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
              <div className="flex-1 flex flex-col gap-2">
                <select
                  value={languageOptions.some((opt) => opt.value === language) ? language : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLanguage(val === 'custom' ? '' : val);
                  }}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
                {(!languageOptions.some((opt) => opt.value === language)) && (
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                    placeholder="Enter locale (e.g., es-MX)"
                    required={!language}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Industry</label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="e.g., SaaS marketing"
                required
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
                max={5}
                value={variants}
                onChange={(e) => setVariants(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                className="w-28 rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-sm">Offers / promos</label>
              <textarea
                value={offers}
                onChange={(e) => setOffers(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Seasonal discounts, bundles, CTAs"
              />
            </div>
            <div>
              <label className="text-sm">Target audience</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Persona, pain points, preferences"
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <label className="text-sm w-32">Automation</label>
              <select
                value={automationCadence}
                onChange={(e) => setAutomationCadence(e.target.value as typeof cadences[number])}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              >
                {cadences.map((c) => (
                  <option key={c} value={c}>
                    {c === 'none' ? 'Manual / single run' : c === 'daily' ? 'Daily (auto)' : 'Weekly (auto)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-32"># of posts</label>
              <input
                type="number"
                min={1}
                max={7}
                value={automationSlots}
                onChange={(e) => setAutomationSlots(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
                className="w-28 rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-32">Start date</label>
              <input
                type="date"
                value={automationStart}
                onChange={(e) => setAutomationStart(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
              />
              Generate AI visuals
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {!!usage?.totalTokens && (
            <p className="text-xs text-brand-muted">
              Tokens used (total): {usage.totalTokens.toLocaleString()}
            </p>
          )}
        </form>
      </div>

      {!!automationPlan.length && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold">Automation plan</h2>
          <p className="text-sm text-brand-muted">{automationCadence === 'none' ? 'Single run' : `${automationCadence} cadence`} ({automationPlan.length} slots)</p>
          <ol className="mt-3 space-y-1 text-sm text-brand-muted">
            {automationPlan.map((d, idx) => (
              <li key={d}>{idx + 1}. {new Date(d).toLocaleString()}</li>
            ))}
          </ol>
        </div>
      )}

      {!!items.length && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">
            Variants <span className="text-brand-muted text-sm">({items.length})</span>
          </h2>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {items.map((v, i) => (
              <div
                key={`${v.platform}-${i}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="card p-4 space-y-3 w-full"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-brand-muted">
                  <span>{v.platform}</span>
                  {v.scheduledFor && <span>{new Date(v.scheduledFor).toLocaleString()}</span>}
                </div>
                {v.headline && <h3 className="text-lg font-semibold">{v.headline}</h3>}
                <pre className="whitespace-pre-wrap text-sm">{v.caption}</pre>
                {!!v.hashtags?.length && (
                  <div className="text-sm opacity-80">
                    {v.hashtags.map((h: string) => `#${h}`).join(' ')}
                  </div>
                )}
                {!!v.altText && (
                  <div className="text-xs text-brand-muted">Alt text: {v.altText}</div>
                )}
                {!!v.visualIdeas?.length && (
                  <div className="text-xs text-brand-muted">Ideas: {v.visualIdeas.join(' • ')}</div>
                )}
                {!!v.imageDataUrl && (
                  <div className="space-y-2">
                    <img src={v.imageDataUrl} alt={v.altText || v.headline || 'Post visual'} className="w-full rounded-xl border border-white/10 object-cover" />
                    <button className="btn-ghost" type="button" onClick={() => downloadImage(v.imageDataUrl!, `${v.platform}_${i+1}`)}>Download visual</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button className="btn-gold" type="button" onClick={() => copyText(v.caption)}>Copy</button>
                  <button className="btn-gold" type="button" onClick={() => exportPNG(i)}>Export PNG</button>
                  <button className="btn-ghost" type="button" onClick={() => exportCSVForItem(v, i)}>Export CSV</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
