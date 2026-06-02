'use client';

import { useState } from 'react';
import IterationPanel from '@/components/IterationPanel';

type Ad = {
  platform: string;
  variant: string;
  angle: string;
  hook: string;
  primaryText: string;
  headlines: string[];
  descriptions: string[];
  cta: string;
  audience: string;
  creativeIdeas: string[];
  utm: { source: string; medium: string; campaign: string; content: string };
};

type Result = {
  platforms: Record<string, Ad[]>;
  retargeting: { summary: string; ads: any[] };
  lookalikeIdeas: string[];
  creativeConcepts: any[];
  testPlan: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  meta:    'Meta (FB / IG)',
  google:  'Google',
  tiktok:  'TikTok',
  youtube: 'YouTube',
};

const PLATFORM_ICONS: Record<string, string> = {
  meta: '📘', google: '🔍', tiktok: '🎵', youtube: '▶️',
};

function copy(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

function AdCard({ ad }: { ad: Ad }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  function copyAll() {
    copy(`${ad.hook}\n\n${ad.primaryText}\n\nHeadlines: ${ad.headlines.join(' | ')}\nCTA: ${ad.cta}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-brand-muted uppercase tracking-wide">Variant {ad.variant}</span>
          <div className="text-xs font-medium text-[color:var(--gold)] mt-0.5">{ad.angle}</div>
        </div>
        <button onClick={copyAll} className="btn-ghost text-xs flex-shrink-0">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Hook */}
      <div className="text-sm font-semibold leading-snug">{ad.hook}</div>

      {/* Primary text */}
      <div className="text-sm text-white/80 leading-relaxed">{ad.primaryText}</div>

      {/* Headlines */}
      <div className="space-y-1">
        {ad.headlines.slice(0, 2).map((h, i) => (
          <div key={i} className="text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">{h}</div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2 text-xs text-brand-muted">
        <span className="px-2.5 py-1 rounded-full border border-white/15 text-white font-medium">{ad.cta}</span>
        <span>· {ad.audience.slice(0, 60)}{ad.audience.length > 60 ? '…' : ''}</span>
      </div>

      {/* Extras collapsed */}
      <button
        type="button"
        onClick={() => setShowDetails(v => !v)}
        className="text-xs text-brand-muted hover:text-white transition flex items-center gap-1"
      >
        <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}>
          <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
        </svg>
        {showDetails ? 'Less' : 'Descriptions, creative ideas & UTM'}
      </button>

      {showDetails && (
        <div className="space-y-2 pt-1 border-t border-white/10 text-xs text-brand-muted">
          {ad.descriptions?.length > 0 && (
            <div>
              <div className="font-medium text-white/60 mb-1">Descriptions</div>
              {ad.descriptions.map((d, i) => <div key={i}>• {d}</div>)}
            </div>
          )}
          {ad.creativeIdeas?.length > 0 && (
            <div>
              <div className="font-medium text-white/60 mb-1">Creative ideas</div>
              {ad.creativeIdeas.map((c, i) => <div key={i}>• {c}</div>)}
            </div>
          )}
          <div className="font-mono opacity-60">
            UTM: ?utm_source={ad.utm.source}&utm_medium={ad.utm.medium}&utm_campaign={ad.utm.campaign}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdPilotPage() {
  const [offer,   setOffer]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [err,     setErr]     = useState<string | null>(null);
  const [showStrategy, setShowStrategy] = useState(false);

  async function generate() {
    if (!offer.trim()) { setErr('Describe your offer first.'); return; }
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await fetch('/api/adpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generation failed');
      setResult(j.result);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!result) return;
    const rows = [['Platform', 'Variant', 'Hook', 'Primary Text', 'Headlines', 'CTA', 'Audience']];
    Object.entries(result.platforms).forEach(([platform, ads]) => {
      ads.forEach(ad => rows.push([
        PLATFORM_LABELS[platform] || platform,
        ad.variant, ad.hook, ad.primaryText,
        ad.headlines.join(' | '), ad.cta, ad.audience,
      ]));
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'adpilot-ads.csv',
    });
    a.click();
  }

  const platforms = result ? Object.keys(result.platforms).filter(k => result.platforms[k]?.length) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">AdPilot</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Describe your offer — get ad copy variants for Meta, Google, and TikTok, ready to test.
        </p>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">What are you advertising?</label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] placeholder:text-brand-muted/60 leading-relaxed"
            rows={4}
            placeholder={`Describe your product, offer, and target audience.\n\ne.g. GrowthPilot — AI marketing suite for startup founders. $49/mo. Cuts content creation time by 70%. Target: marketing managers at B2B SaaS companies.`}
            value={offer}
            onChange={e => setOffer(e.target.value)}
          />
        </div>

        {err && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{err}</div>
        )}

        <button
          onClick={generate}
          disabled={loading || !offer.trim()}
          className="w-full btn-gold py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Generating…</>
          ) : '🎯 Generate Ads'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">

          {/* Platform tabs */}
          {platforms.map(platformKey => (
            <div key={platformKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{PLATFORM_ICONS[platformKey] || '📢'}</span>
                <h2 className="font-semibold">{PLATFORM_LABELS[platformKey] || platformKey}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {result.platforms[platformKey].map(ad => (
                  <AdCard key={`${platformKey}-${ad.variant}`} ad={ad} />
                ))}
              </div>
            </div>
          ))}

          {/* Strategy extras — collapsed */}
          <button
            type="button"
            onClick={() => setShowStrategy(v => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition w-full justify-center py-2 border-t border-white/10 pt-4"
          >
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${showStrategy ? 'rotate-180' : ''}`}>
              <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
            </svg>
            {showStrategy ? 'Hide strategy' : 'Retargeting, lookalike audiences & test plan'}
          </button>

          {showStrategy && (
            <div className="space-y-4">
              {result.retargeting?.ads?.length > 0 && (
                <div className="card p-4 space-y-3">
                  <div className="font-semibold text-sm">Retargeting ads</div>
                  <p className="text-xs text-brand-muted">{result.retargeting.summary}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {result.retargeting.ads.map((ad: any, i: number) => (
                      <div key={i} className="rounded-lg border border-white/10 p-3 text-sm space-y-1">
                        <div className="font-medium">{ad.headline}</div>
                        <div className="text-xs text-brand-muted">{ad.body}</div>
                        <div className="text-xs">CTA: <span className="text-white">{ad.cta}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.lookalikeIdeas?.length > 0 && (
                <div className="card p-4 space-y-2">
                  <div className="font-semibold text-sm">Lookalike audience seeds</div>
                  {result.lookalikeIdeas.map((idea, i) => (
                    <div key={i} className="text-sm text-brand-muted">• {idea}</div>
                  ))}
                </div>
              )}

              {result.testPlan && (
                <div className="card p-4 space-y-2">
                  <div className="font-semibold text-sm">Test plan</div>
                  <div className="text-sm text-brand-muted whitespace-pre-wrap leading-relaxed">{result.testPlan}</div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={exportCSV} className="btn-ghost text-sm">Export CSV</button>
          </div>

          <IterationPanel
            module="adpilot"
            content={result}
            brief={offer}
            onUpdate={updated => setResult(updated)}
            label="Refine these ads"
          />
        </div>
      )}
    </div>
  );
}
