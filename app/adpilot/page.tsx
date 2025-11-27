'use client';
import { useState } from 'react';

type PlatformKey = 'meta'|'google'|'tiktok'|'youtube';
type PlatformVariant = {
  platform: PlatformKey;
  variant: 'A'|'B'|'C';
  angle: string;
  hook: string;
  primaryText: string;
  headlines: string[];
  descriptions: string[];
  cta: string;
  audience: string;
  creativeIdeas: string[];
  videoScript?: string;
  utm: { source: string; medium: string; campaign: string; content: string; term?: string };
};
type RetargetingAd = { headline: string; body: string; cta: string; audience: string; schedule: string };
type CreativeConcept = { platform: PlatformKey|'general'; concepts: string[]; videoScript?: string };
type ResultShape = {
  platforms: Record<PlatformKey, PlatformVariant[]>;
  retargeting: { summary: string; ads: RetargetingAd[] };
  lookalikeIdeas: string[];
  creativeConcepts: CreativeConcept[];
  testPlan: string;
};

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta (Facebook / Instagram)',
  google: 'Google / PMAX',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

export default function AdPilotPage() {
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultShape | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const r = await fetch('/api/adpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to generate');
      setResult(j.result);
    } catch (e:any) {
      setErr(e?.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  function haveRows() {
    return !!result;
  }

  function downloadCSV() {
    if (!result) return;
    const rows: string[][] = [];
    rows.push([
      "Variant","Platform","Angle","Primary Text","Headline","Description","CTA","Audience",
      "UTM Source","UTM Medium","UTM Campaign","UTM Content","UTM Term"
    ]);

    (Object.keys(result.platforms) as PlatformKey[]).forEach((platformKey) => {
      const variants = result.platforms[platformKey] || [];
      variants.forEach((ad) => {
        ad.headlines.forEach((headline) => {
          rows.push([
            `${PLATFORM_LABELS[platformKey]} Variant ${ad.variant}`,
            platformKey,
            ad.angle,
            ad.primaryText,
            headline,
            ad.descriptions.join(" | "),
            ad.cta,
            ad.audience,
            ad.utm.source,
            ad.utm.medium,
            ad.utm.campaign,
            ad.utm.content,
            ad.utm.term || ""
          ]);
        });
      });
    });

    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "adpilot-ads.csv";
    a.click();
  }

  function downloadJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "adpilot-result.json";
    a.click();
  }

  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">AdPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Generate ad sets & <span className="text-[color:var(--gold,theme(colors.brand.gold))]">optimize faster</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">Input your offer or landing page; get A/B/C variants, angles, audiences, UTMs, and a test plan.</p>

        <div className="mt-6 space-y-3">
          <textarea
            className="w-full rounded-md border p-3"
            rows={3}
            placeholder="Describe your offer or paste landing page URL..."
            value={offer}
            onChange={e=>setOffer(e.target.value)}
          />
          <div className="flex gap-3">
            <button className="btn-gold" onClick={handleGenerate} disabled={loading || !offer.trim()}>
              {loading ? "Generating…" : "Generate Ads"}
            </button>
            {err && <div className="text-sm text-red-500 px-2 py-1">{err}</div>}
          </div>
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            {(Object.keys(result.platforms) as PlatformKey[]).map((platformKey) => {
              const variants = result.platforms[platformKey] || [];
              if (!variants.length) return null;
              return (
                <div key={platformKey} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{PLATFORM_LABELS[platformKey]}</div>
                    <span className="badge">Prospecting</span>
                  </div>
                  <div className="mt-3 grid md:grid-cols-2 gap-4">
                    {variants.map((ad) => (
                      <div key={`${platformKey}-${ad.variant}`} className="rounded-lg border border-white/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Variant {ad.variant} • {ad.angle}</div>
                          <span className="text-xs text-brand-muted">{ad.utm.campaign}</span>
                        </div>
                        <div className="text-sm text-brand-muted">{ad.hook}</div>
                        <div className="text-sm text-white/90 whitespace-pre-wrap">{ad.primaryText}</div>
                        <div className="text-sm"><b>Headlines:</b> {ad.headlines.join(" • ")}</div>
                        <div className="text-sm"><b>Descriptions:</b> {ad.descriptions.join(" | ")}</div>
                        <div className="text-sm"><b>CTA:</b> {ad.cta}</div>
                        <div className="text-sm"><b>Audience:</b> {ad.audience}</div>
                        <div className="text-sm"><b>Creative ideas:</b>
                          <ul className="list-disc list-inside text-brand-muted">
                            {ad.creativeIdeas.map((idea) => <li key={idea}>{idea}</li>)}
                          </ul>
                        </div>
                        {ad.videoScript && (
                          <div>
                            <div className="text-xs uppercase text-brand-muted">Video Script</div>
                            <pre className="whitespace-pre-wrap bg-black/30 rounded-md p-2 text-xs">{ad.videoScript}</pre>
                          </div>
                        )}
                        <div className="text-xs text-brand-muted">
                          UTM: {ad.utm.source}/{ad.utm.medium} • {ad.utm.campaign} • {ad.utm.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">Retargeting Flow</div>
                <span className="badge">Warm</span>
              </div>
              <p className="text-sm text-brand-muted whitespace-pre-wrap">{result.retargeting.summary}</p>
              <div className="grid md:grid-cols-2 gap-3">
                {result.retargeting.ads.map((ad) => (
                  <div key={ad.headline} className="rounded-lg border border-white/10 p-3 text-sm space-y-1">
                    <div className="font-medium">{ad.headline}</div>
                    <div className="text-brand-muted">{ad.body}</div>
                    <div><b>CTA:</b> {ad.cta}</div>
                    <div><b>Audience:</b> {ad.audience}</div>
                    <div className="text-xs text-brand-muted">{ad.schedule}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <div className="text-lg font-semibold">Lookalike / LAL Seeds</div>
              <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                {result.lookalikeIdeas.map((idea) => <li key={idea}>{idea}</li>)}
              </ul>
            </div>

            <div className="card p-4 space-y-3">
              <div className="text-lg font-semibold">Creative Concepts & Video Scripts</div>
              <div className="grid md:grid-cols-2 gap-3">
                {result.creativeConcepts.map((concept, idx) => (
                  <div key={`${concept.platform}-${idx}`} className="rounded-lg border border-white/10 p-3 space-y-2 text-sm">
                    <div className="font-medium">{concept.platform === 'general' ? 'General' : PLATFORM_LABELS[concept.platform]}</div>
                    <ul className="list-disc list-inside text-white/80">
                      {concept.concepts.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                    {concept.videoScript && (
                      <pre className="whitespace-pre-wrap bg-black/30 p-2 text-xs rounded-md">
                        {concept.videoScript}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <b>Test Plan</b>
              <pre className="whitespace-pre-wrap text-sm mt-2">{result.testPlan}</pre>
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost" onClick={downloadCSV} disabled={!haveRows()}>
                Export CSV
              </button>
              <button className="btn-ghost" onClick={downloadJSON} disabled={!haveRows()}>
                Save JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
