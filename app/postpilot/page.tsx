'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import IterationPanel from '@/components/IterationPanel';

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { key: 'x',         label: 'X',         icon: '✕' },
  { key: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { key: 'facebook',  label: 'Facebook',  icon: '👥' },
] as const;

const TONES = ['Friendly', 'Professional', 'Witty', 'Inspirational', 'Authoritative'] as const;

type Platform = typeof PLATFORMS[number]['key'];
type Tone = typeof TONES[number];

type Post = {
  platform: Platform;
  headline: string;
  caption: string;
  hashtags: string[];
  altText: string;
  visualIdeas: string[];
  visualPrompt: string;
  scheduledFor?: string | null;
  imageDataUrl?: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Post card ──────────────────────────────────────────────────────────────────

function PostCard({
  post, brief, onUpdate, cardRef, connectedPlatforms,
}: {
  post: Post;
  brief: string;
  onUpdate: (updated: Post) => void;
  cardRef: (el: HTMLDivElement | null) => void;
  connectedPlatforms: string[];
}) {
  const [copied,      setCopied]      = useState(false);
  const [showExtras,  setShowExtras]  = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishErr,  setPublishErr]  = useState<string | null>(null);

  const platform = PLATFORMS.find(p => p.key === post.platform);
  const canPublish = (post.platform === 'linkedin' || post.platform === 'x') &&
    connectedPlatforms.includes(post.platform);

  function copy() {
    copyToClipboard(post.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function publish() {
    setPublishing(true); setPublishErr(null); setPublishedAt(null);
    try {
      const r = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: post.platform, caption: post.caption, hashtags: post.hashtags }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Publish failed');
      setPublishedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setPublishErr(e?.message || 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div ref={cardRef} className="card p-5 space-y-4">
      {/* Platform badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{platform?.icon}</span>
          <span className="text-sm font-medium capitalize">{post.platform}</span>
        </div>
        {post.scheduledFor && (
          <span className="text-xs text-brand-muted">{new Date(post.scheduledFor).toLocaleDateString()}</span>
        )}
      </div>

      {/* Headline */}
      {post.headline && (
        <div className="font-semibold leading-snug">{post.headline}</div>
      )}

      {/* Caption */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{post.caption}</div>

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div className="text-sm text-brand-muted/80">
          {post.hashtags.map(h => `#${h}`).join(' ')}
        </div>
      )}

      {/* Generated image */}
      {post.imageDataUrl && (
        <img
          src={post.imageDataUrl}
          alt={post.altText || post.headline}
          className="w-full rounded-xl border border-white/10 object-cover"
        />
      )}

      {/* Publish feedback */}
      {publishedAt && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          Published at {publishedAt}
        </div>
      )}
      {publishErr && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{publishErr}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={copy}
          className="btn-gold flex items-center gap-1.5 text-sm"
        >
          {copied ? (
            <><svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copied!</>
          ) : (
            <><svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg> Copy</>
          )}
        </button>

        {canPublish && !publishedAt && (
          <button
            type="button"
            onClick={publish}
            disabled={publishing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
          >
            {publishing ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg> Publishing…</>
            ) : (
              <><svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Publish to {post.platform === 'x' ? 'X' : 'LinkedIn'}</>
            )}
          </button>
        )}

        {(post.platform === 'linkedin' || post.platform === 'x') && !canPublish && (
          <a href="/settings/social"
            className="text-xs text-brand-muted hover:text-white transition underline underline-offset-2">
            Connect {post.platform === 'x' ? 'X' : 'LinkedIn'} to publish →
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowExtras(v => !v)}
          className="btn-ghost text-sm"
        >
          {showExtras ? 'Less' : 'More ↓'}
        </button>
      </div>

      {/* Extras (alt text, visual ideas) — collapsed by default */}
      {showExtras && (
        <div className="space-y-2 border-t border-white/10 pt-3 text-xs text-brand-muted">
          {post.altText && (
            <div><span className="font-medium text-white/60">Alt text:</span> {post.altText}</div>
          )}
          {post.visualIdeas?.length > 0 && (
            <div>
              <span className="font-medium text-white/60">Visual ideas:</span>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {post.visualIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
              </ul>
            </div>
          )}
          {post.imageDataUrl && (
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                const a = document.createElement('a');
                a.href = post.imageDataUrl!;
                a.download = `${post.platform}_visual.png`;
                a.click();
              }}
            >
              Download visual
            </button>
          )}
        </div>
      )}

      {/* Iteration panel */}
      <IterationPanel
        module="postpilot"
        content={post}
        brief={brief}
        onUpdate={(updated) => onUpdate({ ...post, ...updated })}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PostPilotPage() {
  // Core fields
  const [brief, setBrief]         = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'linkedin']);

  // Advanced (hidden by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone]           = useState<Tone>('Friendly');
  const [audience, setAudience]   = useState('');
  const [language, setLanguage]   = useState('en-US');
  const [variants, setVariants]   = useState(1);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [posts, setPosts]     = useState<Post[]>([]);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [fromResearch, setFromResearch] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedBrief = sessionStorage.getItem('gp_research_brief');
      if (storedBrief) { setBrief(storedBrief); setFromResearch(true); sessionStorage.removeItem('gp_research_brief'); }
      sessionStorage.removeItem('gp_research_keywords');
    } catch {}
    fetch('/api/social/accounts')
      .then(r => r.json())
      .then(j => setConnectedPlatforms((j.accounts || []).map((a: any) => a.platform)))
      .catch(() => {});
  }, []);

  const togglePlatform = (key: Platform) =>
    setPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim()) { setError('Tell us what to post about.'); return; }
    if (!platforms.length) { setError('Pick at least one platform.'); return; }

    setLoading(true); setError(null); setPosts([]);

    try {
      const res = await fetch('/api/postpilot/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topic: brief.trim(),
          industry: 'General',
          voice: tone,
          language,
          audience: audience.trim() || undefined,
          platforms,
          variants,
        }),
      });

      const json = await res.json().catch(() => ({ ok: false, error: 'Server error' }));
      if (!res.ok || json.ok === false) throw new Error(json?.error || 'Generation failed');

      const items: Post[] = Array.isArray(json.items) ? json.items : [];
      setPosts(items);
      cardRefs.current = new Array(items.length).fill(null);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const briefForIteration = brief.trim();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">PostPilot</h1>
          <Link href="/agent/research?module=postpilot" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/></svg>
            Research first
          </Link>
        </div>
        <p className="text-brand-muted mt-1 text-sm">
          Describe what you want to post — get ready-to-publish captions for every platform.
        </p>
        {fromResearch && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Brief pre-filled from Research Agent
          </div>
        )}
      </div>

      {/* ── Form ── */}
      <form onSubmit={generate} className="card p-6 space-y-5">

        {/* Main input */}
        <div>
          <label className="text-sm font-medium block mb-1.5">
            What do you want to post about?
          </label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] placeholder:text-brand-muted/60 leading-relaxed"
            rows={4}
            placeholder="e.g. We just launched our AI writing tool. It cuts content creation time in half. Targeting startup founders who are tired of slow content workflows."
            value={brief}
            onChange={e => setBrief(e.target.value)}
            maxLength={2000}
          />
          <div className="text-right text-xs text-brand-muted mt-0.5">{brief.length}/2000</div>
        </div>

        {/* Platform selector */}
        <div>
          <label className="text-sm font-medium block mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePlatform(p.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition ${
                  platforms.includes(p.key)
                    ? 'border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 text-white'
                    : 'border-white/10 text-brand-muted hover:border-white/20'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
          </svg>
          {showAdvanced ? 'Hide options' : 'Tone, audience & language'}
        </button>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="grid gap-4 md:grid-cols-2 pt-1 border-t border-white/10">
            {/* Tone */}
            <div>
              <label className="text-xs text-brand-muted block mb-1.5">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      tone === t
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 text-brand-muted hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs text-brand-muted block mb-1.5">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="en-US">English</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ar-SA">Arabic</option>
                <option value="zh-CN">Chinese (Simplified)</option>
                <option value="fa-IR">Persian</option>
              </select>
            </div>

            {/* Audience */}
            <div className="md:col-span-2">
              <label className="text-xs text-brand-muted block mb-1.5">Target audience <span className="opacity-60">(optional)</span></label>
              <input
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
                placeholder="e.g. startup founders, B2B SaaS teams"
                value={audience}
                onChange={e => setAudience(e.target.value)}
              />
            </div>

            {/* Variants */}
            <div>
              <label className="text-xs text-brand-muted block mb-1.5">Variants per platform</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setVariants(v => Math.max(1, v - 1))}
                  className="w-8 h-8 rounded-lg border border-white/15 hover:bg-white/5 text-sm transition">−</button>
                <span className="w-6 text-center text-sm font-medium">{variants}</span>
                <button type="button" onClick={() => setVariants(v => Math.min(3, v + 1))}
                  className="w-8 h-8 rounded-lg border border-white/15 hover:bg-white/5 text-sm transition">+</button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !brief.trim() || !platforms.length}
          className="w-full btn-gold py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
              </svg>
              Generating…
            </>
          ) : (
            <>✨ Generate Posts</>
          )}
        </button>
      </form>

      {/* ── Results ── */}
      {posts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Your posts{' '}
              <span className="text-brand-muted font-normal text-sm">({posts.length})</span>
            </h2>
            <button
              type="button"
              className="text-xs text-brand-muted hover:text-white transition"
              onClick={() => {
                const all = posts.map(p =>
                  `--- ${p.platform.toUpperCase()} ---\n${p.caption}\n${p.hashtags.map(h => `#${h}`).join(' ')}`
                ).join('\n\n');
                copyToClipboard(all);
              }}
            >
              Copy all
            </button>
          </div>

          {posts.map((post, i) => (
            <PostCard
              key={`${post.platform}-${i}`}
              post={post}
              brief={briefForIteration}
              onUpdate={(updated) =>
                setPosts(prev => prev.map((p, idx) => idx === i ? updated : p))
              }
              cardRef={(el) => { cardRefs.current[i] = el; }}
              connectedPlatforms={connectedPlatforms}
            />
          ))}
        </div>
      )}
    </div>
  );
}
