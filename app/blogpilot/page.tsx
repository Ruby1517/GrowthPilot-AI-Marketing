'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import IterationPanel from '@/components/IterationPanel';

type ApiResp = {
  brief: string;
  outline: string[];
  draft: string;
  meta: { title: string; description: string };
  faq: { q: string; a: string }[];
  altText: string[];
  readability: { score: number; grade: string };
  input: { keywords: string[]; url?: string; tone?: string; wordCount?: number };
};

type DraftItem = {
  _id: string;
  createdAt: string;
  meta?: { title?: string };
  input?: { keywords?: string[] };
};

const TONES = ['Neutral', 'Friendly', 'Expert', 'Persuasive'] as const;

function copy(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

function download(name: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click(); URL.revokeObjectURL(a.href);
}

export default function BlogPilotPage() {
  const [keywords,  setKeywords]  = useState('');
  const [url,       setUrl]       = useState('');
  const [tone,      setTone]      = useState<typeof TONES[number]>('Neutral');
  const [wordCount, setWordCount] = useState(1000);

  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState<string | null>(null);
  const [data, setData]     = useState<ApiResp | null>(null);
  const [saved, setSaved]   = useState(false);

  const [drafts,      setDrafts]      = useState<DraftItem[]>([]);
  const [showDrafts,  setShowDrafts]  = useState(false);
  const [showExtras,  setShowExtras]  = useState(false);
  const [fromResearch, setFromResearch] = useState(false);

  // Pick up enriched brief from Research Agent if user navigated from there
  useEffect(() => {
    try {
      const brief = sessionStorage.getItem('gp_research_brief');
      const kws   = sessionStorage.getItem('gp_research_keywords');
      if (kws) { setKeywords(kws); setFromResearch(true); sessionStorage.removeItem('gp_research_keywords'); }
      if (brief) { sessionStorage.removeItem('gp_research_brief'); }
    } catch {}
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!keywords.trim()) { setErr('Enter at least one keyword.'); return; }
    setBusy(true); setErr(null); setData(null); setSaved(false);
    try {
      const r = await fetch('/api/blogpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, url: url || undefined, tone: tone.toLowerCase(), wordCount }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generation failed');
      setData(j);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!data) return;
    const r = await fetch('/api/blogpilot/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (r.ok) { setSaved(true); loadDrafts(); }
    else alert((await r.json())?.error || 'Save failed');
  }

  async function loadDrafts() {
    const r = await fetch('/api/blogpilot/save?limit=10', { cache: 'no-store' });
    const j = await r.json();
    setDrafts(j.items || []);
  }

  async function deleteDraft(id: string) {
    if (!confirm('Delete this draft?')) return;
    setDrafts(d => d.filter(x => x._id !== id));
    await fetch(`/api/blogpilot/${id}`, { method: 'DELETE' });
  }

  useEffect(() => { loadDrafts(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">BlogPilot</h1>
          <Link href="/agent/research?module=blogpilot" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
            Research first
          </Link>
        </div>
        <p className="text-brand-muted mt-1 text-sm">
          Enter a topic or keywords — get a full SEO blog draft with outline, meta, and FAQ.
        </p>
        {fromResearch && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Keywords pre-filled from Research Agent
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={generate} className="card p-6 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1.5">Topic or keywords *</label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] placeholder:text-brand-muted/60 leading-relaxed"
            rows={3}
            placeholder="e.g. AI marketing tools for startups, content automation, seo blog writer"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => setTone(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${tone === t ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-brand-muted hover:border-white/20'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Approx. word count</label>
            <div className="flex items-center gap-2">
              {[600, 1000, 1500, 2000].map(w => (
                <button key={w} type="button" onClick={() => setWordCount(w)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${wordCount === w ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-brand-muted hover:border-white/20'}`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Reference URL <span className="opacity-60">(optional — we&apos;ll use it as context)</span></label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
            placeholder="https://example.com/related-article"
            value={url}
            onChange={e => setUrl(e.target.value)}
            type="url"
          />
        </div>

        {err && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{err}</div>
        )}

        <button type="submit" disabled={busy || !keywords.trim()}
          className="w-full btn-gold py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium">
          {busy ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Writing…</>
          ) : '✍️ Write Blog Draft'}
        </button>
      </form>

      {/* Results */}
      {data && (
        <div className="space-y-4">

          {/* Meta + outline in one card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{data.meta.title}</h2>
              <button onClick={() => copy(data.meta.title)} className="btn-ghost text-xs">Copy title</button>
            </div>
            <p className="text-sm text-brand-muted">{data.meta.description}</p>
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs uppercase tracking-widest text-brand-muted mb-2">Outline</div>
              <ol className="space-y-1">
                {data.outline.map((h, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-brand-muted flex-shrink-0">{i + 1}.</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Draft */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold">Draft</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => copy(data.draft)} className="btn-ghost text-xs">Copy</button>
                <button onClick={() => download('blog.md', data.draft, 'text/markdown')} className="btn-ghost text-xs">Export .md</button>
                <button
                  onClick={saveDraft}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${saved ? 'border-emerald-500/40 text-emerald-400' : 'btn-ghost'}`}
                >
                  {saved ? '✓ Saved' : 'Save draft'}
                </button>
              </div>
            </div>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap text-white/85 max-h-96 overflow-y-auto">{data.draft}</pre>

            <IterationPanel
              module="blogpilot"
              content={data}
              brief={keywords}
              onUpdate={updated => setData(updated)}
              label="Refine this draft"
            />
          </div>

          {/* FAQ + extras collapsed */}
          <button
            type="button"
            onClick={() => setShowExtras(v => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition w-full justify-center py-2"
          >
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${showExtras ? 'rotate-180' : ''}`}>
              <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
            </svg>
            {showExtras ? 'Hide extras' : 'Show FAQ, alt text & readability'}
          </button>

          {showExtras && (
            <div className="space-y-4">
              {data.faq?.length > 0 && (
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">FAQ</div>
                    <button onClick={() => copy(data.faq.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n'))} className="btn-ghost text-xs">Copy all</button>
                  </div>
                  {data.faq.map((f, i) => (
                    <div key={i} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                      <div className="text-sm font-medium">{f.q}</div>
                      <div className="text-sm text-brand-muted mt-1">{f.a}</div>
                    </div>
                  ))}
                </div>
              )}
              {data.altText?.length > 0 && (
                <div className="card p-5">
                  <div className="text-sm font-semibold mb-2">Image alt text suggestions</div>
                  <ul className="space-y-1">
                    {data.altText.map((t, i) => <li key={i} className="text-sm text-brand-muted">• {t}</li>)}
                  </ul>
                </div>
              )}
              {data.readability && (
                <div className="card p-4 flex items-center gap-3">
                  <div className="text-2xl font-semibold">{data.readability.score}</div>
                  <div>
                    <div className="text-sm font-medium">Flesch Reading Ease</div>
                    <div className="text-xs text-brand-muted">{data.readability.grade} reading level</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDrafts(v => !v)}
            className="flex items-center justify-between w-full text-sm text-brand-muted hover:text-white transition"
          >
            <span>Saved drafts ({drafts.length})</span>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${showDrafts ? 'rotate-180' : ''}`}>
              <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
            </svg>
          </button>

          {showDrafts && (
            <div className="grid gap-3 md:grid-cols-2">
              {drafts.map(d => (
                <div key={d._id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="text-sm font-medium line-clamp-2">{d.meta?.title || '(untitled)'}</div>
                  <div className="text-xs text-brand-muted">{d.input?.keywords?.slice(0,3).join(', ')}</div>
                  <div className="text-xs text-brand-muted">{new Date(d.createdAt).toLocaleDateString()}</div>
                  <div className="flex gap-2">
                    <a href={`/blogpilot/${d._id}`} className="btn-ghost text-xs">Open</a>
                    <button onClick={() => deleteDraft(d._id)} className="text-xs text-rose-400 hover:text-rose-300 transition">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
