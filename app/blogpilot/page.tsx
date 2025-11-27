'use client';

import { useEffect, useState } from 'react';

type TargetLink = { anchor: string; url: string };
type ApiResp = {
  brief: string;
  outline: string[];
  draft: string; // markdown
  meta: { title: string; description: string };
  faq: { q: string; a: string }[];
  altText: string[];
  citations: string[];
  readability: { score: number; grade: string };
  schema?: { article?: any; faq?: any }; // <-- optional now
  input: { keywords: string[]; url?: string; tone?: string; wordCount?: number; targetLinks?: TargetLink[] };
};

type HistoryItem = {
  _id: string;
  createdAt: string;
  meta?: { title?: string; description?: string };
  readability?: { score?: number };
  input?: { keywords?: string[]; url?: string; tone?: string; wordCount?: number };
};

function formatDate(d: string) {
  return new Date(d).toLocaleString();
}

export default function BlogPilotPage() {
  // form state
  const [keywords, setKeywords] = useState('');
  const [url, setUrl] = useState('');
  const [tone, setTone] = useState('neutral');
  const [wordCount, setWordCount] = useState(1500);
  const [linksRaw, setLinksRaw] = useState(''); // one per line: Anchor | /path-or-url

  // generation state
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResp | null>(null);

  // history state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  function parseLinks(raw: string): TargetLink[] {
    return raw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [anchor, url] = line.split('|').map(s => (s ?? '').trim());
        return anchor && url ? { anchor, url } : null;
      })
      .filter(Boolean) as TargetLink[];
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    setData(null);
    try {
      const r = await fetch('/api/blogpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          url: url || undefined,
          tone,
          wordCount,
          targetLinks: parseLinks(linksRaw),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to generate');
      setData(j);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function download(name: string, content: string, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function mdToHtml(md: string) {
    // very minimal — for real preview use a Markdown renderer; here we just export
    return `<!doctype html><meta charset="utf-8"><title>${data?.meta.title ?? 'Blog'}</title>
<meta name="description" content="${data?.meta.description ?? ''}">
<article>\n${md.replace(/\n/g, '<br/>')}\n</article>`;
  }

  // --- History helpers ---
  async function loadHistory() {
    setLoadingList(true);
    try {
      const r = await fetch('/api/blogpilot/save?limit=20', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Load failed');
      setHistory(j.items || []);
    } catch {
      // optional: toast/alert
    } finally {
      setLoadingList(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm('Delete this draft? This cannot be undone.');
    if (!ok) return;
    const prev = history;
    setHistory(h => h.filter(x => x._id !== id)); // optimistic
    const r = await fetch(`/api/blogpilot/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      alert('Delete failed');
      setHistory(prev);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 pb-12 overflow-x-hidden">
      <div className="card p-8 md:p-12 min-w-0">
        <span className="badge mb-4">BlogPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Generate SEO-optimized blogs <span className="text-[color:var(--gold,theme(colors.brand.gold))]">from keywords or a URL</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Brief → outline → long-form draft with meta, FAQ, JSON-LD, internal links, and readability targets.
        </p>

        <form onSubmit={onGenerate} className="mt-6 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-brand-muted">Keywords (comma or newlines)</label>
              <textarea
                className="mt-1 w-full rounded-md border p-3 h-24"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="ai blog writer, seo automation"
                required
              />
            </div>
            <div>
              <label className="text-sm text-brand-muted">Reference URL (optional)</label>
              <input
                className="mt-1 w-full rounded-md border p-3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/related-article"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-brand-muted">Tone</label>
              <select className="mt-1 w-full rounded-md border p-2.5" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="neutral">Neutral</option>
                <option value="friendly">Friendly</option>
                <option value="expert">Expert</option>
                <option value="persuasive">Persuasive</option>
                <option value="playful">Playful</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-brand-muted">Target words</label>
              <input
                type="number" min={400} max={4000}
                className="mt-1 w-full rounded-md border p-2.5"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value || '1500', 10))}
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm text-brand-muted">Internal links (one per line: Anchor | URL)</label>
              <textarea
                className="mt-1 w-full rounded-md border p-3 h-24"
                value={linksRaw}
                onChange={(e) => setLinksRaw(e.target.value)}
                placeholder={`AI Marketing Suite | /postpilot\nClipPilot Video Tool | /clippilot`}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-gold" disabled={busy}>
              {busy ? 'Generating…' : 'Generate Blog Draft'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setData(null); setErr(null); }}>
              Reset
            </button>
          </div>

          {err && <div className="mt-2 rounded-md border px-3 py-2 text-sm text-red-600 bg-red-50">{err}</div>}
        </form>
      </div>

      {data && (
        <div className="mt-8 grid gap-6">
          {/* Brief */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Brief</h2>
              <button className="btn-ghost" onClick={() => copy(data.brief)}>Copy</button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-brand-muted">{data.brief}</p>
          </div>

          {/* Outline */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Outline</h2>
              <button className="btn-ghost" onClick={() => copy(data.outline.join('\n'))}>Copy</button>
            </div>
            <ul className="mt-3 list-disc pl-6 text-sm">
              {data.outline.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>

          {/* Draft */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Draft (Markdown)</h2>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => copy(data.draft)}>Copy Markdown</button>
                <button className="btn-ghost" onClick={() => download('blog.md', data.draft, 'text/markdown')}>Export .md</button>
                <button className="btn-ghost" onClick={() => download('blog.html', mdToHtml(data.draft), 'text/html')}>Export .html</button>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    if (!data) return;
                    const r = await fetch('/api/blogpilot/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
                    const j = await r.json();
                    if (!r.ok) { alert(j?.error || 'Save failed'); return; }
                    alert('Saved! Draft ID: ' + j.id);
                    loadHistory();
                  }}
                >
                  Save Draft
                </button>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-sm">{data.draft}</pre>
          </div>

          {/* Meta */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Meta</h2>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => copy(data.meta.title)}>Copy Title</button>
                <button className="btn-ghost" onClick={() => copy(data.meta.description)}>Copy Description</button>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <div><span className="text-brand-muted">Title:</span> {data.meta.title}</div>
              <div className="mt-1"><span className="text-brand-muted">Description:</span> {data.meta.description}</div>
            </div>
          </div>

          {/* FAQ */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">FAQ</h2>
              <button className="btn-ghost" onClick={() => copy(JSON.stringify(data.faq, null, 2))}>Copy</button>
            </div>
            <div className="mt-3 space-y-2">
              {data.faq.map((f, i) => (
                <div key={i}>
                  <div className="font-medium">Q: {f.q}</div>
                  <div className="text-sm text-brand-muted">A: {f.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alt text */}
          <div className="card p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Image Alt-text suggestions</h2>
              <button className="btn-ghost" onClick={() => copy(data.altText.join('\n'))}>Copy</button>
            </div>
            <ul className="mt-3 list-disc pl-6 text-sm">
              {data.altText.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

          {/* Readability */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Readability</h2>
            <div className="mt-2 text-sm">
              <div>Flesch Reading Ease: <span className="font-medium">{data.readability.score}</span> ({data.readability.grade})</div>
            </div>
          </div>

          {/* JSON-LD */}
          {(data?.schema?.article || data?.schema?.faq) && (
            <div className="card p-6 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">JSON-LD (Article + FAQPage)</h2>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => copy(JSON.stringify(data?.schema?.article ?? {}, null, 2))}
                  >
                    Copy Article
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => copy(JSON.stringify(data?.schema?.faq ?? {}, null, 2))}
                  >
                    Copy FAQ
                  </button>
                </div>
              </div>
              <pre className="mt-3 text-xs overflow-x-auto">
                {JSON.stringify(
                  { article: data?.schema?.article ?? {}, faq: data?.schema?.faq ?? {} },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* Fact-check notes placeholder */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Fact-check notes</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Add citations, sources, or verification notes here. (The API returns a <code>citations</code> array you can populate later.)
            </p>
            {data.citations?.length ? (
              <ul className="mt-2 list-disc pl-6 text-sm">
                {data.citations.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-brand-muted">No citations provided yet.</div>
            )}
          </div>
        </div>
      )}

      {/* History Grid */}
      <div className="mt-8 card p-6 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Drafts</h2>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={loadHistory} disabled={loadingList}>
              {loadingList ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No drafts yet. Generate a blog and click “Save Draft”.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {history.map((it) => {
              const title = it.meta?.title || '(untitled)';
              const kws = it.input?.keywords?.slice?.(0, 3)?.join(', ');
              const urlHint = it.input?.url;
              const toneHint = it.input?.tone;
              const score = it.readability?.score ?? null;

              return (
                <div key={it._id} className="rounded-lg border border-[color:var(--card-stroke,rgba(255,255,255,0.08))] p-4">
                  <div className="text-sm text-brand-muted">{formatDate(it.createdAt)}</div>
                  <div className="mt-1 line-clamp-2 font-medium">{title}</div>

                  <div className="mt-2 text-xs text-brand-muted space-y-1">
                    {kws && <div><span className="opacity-70">Keywords:</span> {kws}{it.input?.keywords && it.input.keywords.length > 3 ? '…' : ''}</div>}
                    {urlHint && <div className="truncate"><span className="opacity-70">URL:</span> {urlHint}</div>}
                    <div><span className="opacity-70">Tone:</span> {toneHint || 'neutral'}</div>
                    {score !== null && <div><span className="opacity-70">Flesch:</span> {score}</div>}
                  </div>

                  <div className="mt-3 flex items-center gap-1 whitespace-nowrap">
                    <a className="btn-ghost text-[11px] px-1.5 py-0.5" href={`/blogpilot/${it._id}`}>Open</a>
                    <a className="btn-ghost text-[11px] px-1.5 py-0.5" href={`/api/blogpilot/${it._id}`} target="_blank" rel="noreferrer">Open JSON</a>
                    <button
                      className="btn-ghost text-[11px] px-1.5 py-0.5"
                      onClick={async () => {
                        const r = await fetch(`/api/blogpilot/${it._id}`);
                        const j = await r.json();
                        if (!r.ok) { alert(j?.error || 'Open failed'); return; }
                        await navigator.clipboard.writeText(j.draft || '');
                        alert('Draft markdown copied to clipboard');
                      }}
                    >
                      Copy Markdown
                    </button>
                    <button className="btn-ghost text-[11px] px-1.5 py-0.5 text-red-500" onClick={() => handleDelete(it._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  );
}
