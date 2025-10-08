'use client';
import { useState } from 'react';

type Variant = {
  platform: 'meta'|'google';
  angle: string;
  primaryText: string;
  headlines: string[];
  descriptions: string[];
  cta: string;
  audience: string;
  imagePrompts: string[];
  utm: { source: string; medium: string; campaign: string; content: string; term?: string };
};
type ResultShape = { variants: { A: Variant; B: Variant; C: Variant }; testPlan: string };

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
    if (!result) return false;
    const v = result.variants;
    return !!(v?.A && v?.B && v?.C);
  }

  function downloadCSV() {
    if (!result) return;
    const rows: string[][] = [];
    rows.push([
      "Variant","Platform","Angle","Primary Text","Headline","Description","CTA","Audience",
      "UTM Source","UTM Medium","UTM Campaign","UTM Content","UTM Term"
    ]);

    (["A","B","C"] as const).forEach((key) => {
      const ad = (result.variants as any)[key] as Variant;
      if (!ad) return;
      ad.headlines.forEach((headline) => {
        rows.push([
          key,
          ad.platform,
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

    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "adpilot-ads.csv";
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
            {(["A","B","C"] as const).map(key => {
              const ad = (result.variants as any)[key] as Variant;
              if (!ad) return null;
              return (
                <div key={key} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Variant {key} • {ad.platform.toUpperCase()}</div>
                    <span className="badge">{ad.angle}</span>
                  </div>
                  <div className="mt-2 text-brand-muted">{ad.primaryText}</div>
                  <div className="mt-2"><b>Headlines:</b> {ad.headlines.join(" • ")}</div>
                  <div><b>Descriptions:</b> {ad.descriptions.join(" | ")}</div>
                  <div><b>CTA:</b> {ad.cta}</div>
                  <div><b>Audience:</b> {ad.audience}</div>
                  <div><b>Image Prompts:</b> {ad.imagePrompts.join(" | ")}</div>
                  <div><b>UTM:</b> {`${ad.utm.source}/${ad.utm.medium} • ${ad.utm.campaign} • ${ad.utm.content}`}</div>
                </div>
              );
            })}

            <div className="card p-4">
              <b>Test Plan</b>
              <pre className="whitespace-pre-wrap text-sm mt-2">{result.testPlan}</pre>
            </div>

            <button className="btn-ghost" onClick={downloadCSV} disabled={!haveRows()}>
              Export CSV
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
