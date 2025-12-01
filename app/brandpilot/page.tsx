'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';

type BrandDoc = {
  _id: string;
  company: string;
  vibe: string;
  tagline?: string;
  industry?: string;
  mission?: string;
  palette?: string[];
  fonts?: string[];
  voice?: string[];
  slogans?: string[];
  summary?: string;
  voiceGuidelines?: string[];
  messagingPillars?: string[];
  sampleCaptions?: string[];
  sampleEmailIntro?: string;
  adCopyShort?: string;
  adCopyLong?: string;
  videoStyle?: string[];
  toneSelections?: string[];
  values?: string[];
  wordsToUse?: string[];
  wordsToAvoid?: string[];
  primaryAudience?: string;
  secondaryAudience?: string;
  painPoints?: string[];
  goals?: string[];
  colorHints?: string[];
  typographyHeading?: string;
  typographyBody?: string;
  visualStyle?: string[];
  socialThemes?: string[];
  images?: Array<{type:string; url:string}>;
  primary?: string;
  secondary?: string;
  fontPrimary?: string;
  fontSecondary?: string;
  voiceSelected?: string[];
};

export default function BrandPilotPage() {
  const [form, setForm] = useState({
    company: '',
    tagline: '',
    industry: '',
    mission: '',
    values: '',
    vibe: '',
    toneSelections: [] as string[],
    voiceDescription: '',
    wordsToUse: '',
    wordsToAvoid: '',
    primaryAudience: '',
    secondaryAudience: '',
    painPoints: '',
    goals: '',
    colorHints: '',
    typographyHeading: '',
    typographyBody: '',
    visualStyle: '',
    assetNotes: '',
    socialThemes: '',
  });
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<BrandDoc | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [assets, setAssets] = useState<Array<{ _id: string; url?: string | null; key: string; createdAt: string }>>([]);
  const [assetsMsg, setAssetsMsg] = useState<string | null>(null);

  async function handleGenerate() {
    if (!form.company.trim() || !form.vibe.trim()) {
      alert('Add a brand name and vibe keywords first.');
      return;
    }
    setLoading(true);
    try {
      const toList = (input: string) =>
        input
          .split(/\r?\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);
      const res = await fetch('/api/brandpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company,
          tagline: form.tagline,
          industry: form.industry,
          mission: form.mission,
          values: toList(form.values),
          vibe: form.vibe,
          toneSelections: form.toneSelections,
          voiceDescription: form.voiceDescription,
          wordsToUse: toList(form.wordsToUse),
          wordsToAvoid: toList(form.wordsToAvoid),
          primaryAudience: form.primaryAudience,
          secondaryAudience: form.secondaryAudience,
          painPoints: toList(form.painPoints),
          goals: toList(form.goals),
          colorHints: toList(form.colorHints),
          typographyHeading: form.typographyHeading,
          typographyBody: form.typographyBody,
          visualStyle: toList(form.visualStyle),
          assetNotes: form.assetNotes,
          socialThemes: toList(form.socialThemes),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');
      setDoc(data.doc);
      setStepIdx(0);
      await loadAssets(data.doc._id);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleImages() {
    if (!doc?._id) return alert('Generate first');
    setLoading(true);
    try {
      const res = await fetch('/api/brandpilot/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate images');
      setDoc(data.doc);
      await loadAssets(data.doc._id);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const toneOptions = ['Friendly','Professional','Energetic','Calm','Humorous','Luxury','Bold','Warm','Playful'];

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTone(tone: string) {
    setForm((prev) => {
      const next = new Set(prev.toneSelections || []);
      if (next.has(tone)) next.delete(tone);
      else next.add(tone);
      return { ...prev, toneSelections: Array.from(next) };
    });
  }

  // === NEW: selections ===
  function toggleDocVoice(v: string) {
    if (!doc) return;
    const sel = new Set(doc.voiceSelected || []);
    if (sel.has(v)) sel.delete(v);
    else sel.add(v);
    setDoc({ ...doc, voiceSelected: Array.from(sel) });
  }

  function choosePrimary(hex: string) {
    if (!doc) return;
    setDoc({ ...doc, primary: hex });
  }

  function chooseSecondary(hex: string) {
    if (!doc) return;
    setDoc({ ...doc, secondary: hex });
  }

  function chooseFontPair(pair: string) {
    // support either "Inter + Playfair" OR two separate picks
    if (!doc) return;
    // If pair contains '+', split; else make primary only.
    const parts = pair.split('+').map(s => s.trim()).filter(Boolean);
    const [fp, fs] = parts;
    setDoc({
      ...doc,
      fontPrimary: fp || pair,
      fontSecondary: fs || doc.fontSecondary || '',
    });
  }

  async function saveSelections() {
    if (!doc?._id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/brandpilot/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doc._id,
          primary: doc.primary,
          secondary: doc.secondary,
          fontPrimary: doc.fontPrimary,
          fontSecondary: doc.fontSecondary,
          voiceSelected: doc.voiceSelected || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setDoc(data.doc);
    } catch (e: any) {
      alert(e.message || 'Error saving');
    } finally {
      setLoading(false);
    }
  }

  async function loadAssets(projectId: string) {
    try {
      setAssetsMsg(null);
      const r = await fetch(`/api/assets?projectId=${projectId}`);
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setAssets(
        (j.items || []).map((a: any) => ({
          _id: a._id,
          url: a.url,
          key: a.key,
          createdAt: a.createdAt,
        }))
      );
    } catch (e: any) {
      setAssetsMsg(e?.message || 'Failed to load assets');
    }
  }

  useEffect(() => {
    if (doc?._id) {
      loadAssets(doc._id);
    }
  }, [doc?._id]);

  const steps = useMemo(() => [
    { key: 'brand', title: 'Brand Info', desc: 'Name, tagline, mission, values.' },
    { key: 'voice', title: 'Voice & Tone', desc: 'Tone traits, vocabulary, guardrails.' },
    { key: 'audience', title: 'Audience', desc: 'Primary/secondary personas, pains, goals.' },
    { key: 'style', title: 'Colors & Style', desc: 'Color hints, typography, visual mood.' },
    { key: 'assets', title: 'Logo & Assets', desc: 'Notes about logos or uploads.' },
    { key: 'social', title: 'Social Templates', desc: 'Themes to highlight + generate.' },
  ], []);

  function renderStepContent() {
    const commonInput =
      'w-full rounded-md border border-white/10 bg-transparent p-2.5 text-sm placeholder:text-brand-muted focus:border-white/30 focus:outline-none';

    switch (steps[stepIdx].key) {
      case 'brand':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-brand-muted">Brand name</label>
              <input
                className={commonInput}
                value={form.company}
                onChange={(e) => updateForm('company', e.target.value)}
                placeholder="UrbanLeaf Café"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-brand-muted">Tagline</label>
                <input
                  className={commonInput}
                  value={form.tagline}
                  onChange={(e) => updateForm('tagline', e.target.value)}
                  placeholder="Fresh brews. Fresh vibes."
                />
              </div>
              <div>
                <label className="text-sm text-brand-muted">Industry</label>
                <input
                  className={commonInput}
                  value={form.industry}
                  onChange={(e) => updateForm('industry', e.target.value)}
                  placeholder="Coffee Shop / Delivery / Local"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-brand-muted">Mission</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.mission}
                onChange={(e) => updateForm('mission', e.target.value)}
                placeholder="Serve fresh, locally roasted coffee with a warm, urban vibe."
              />
            </div>
            <div>
              <label className="text-sm text-brand-muted">Values (one per line)</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.values}
                onChange={(e) => updateForm('values', e.target.value)}
                placeholder="Quality&#10;Community&#10;Sustainability"
              />
            </div>
            <div>
              <label className="text-sm text-brand-muted">Vibe keywords</label>
              <input
                className={commonInput}
                value={form.vibe}
                onChange={(e) => updateForm('vibe', e.target.value)}
                placeholder="warm, cozy, urban, playful"
              />
            </div>
          </div>
        );
      case 'voice':
        return (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-brand-muted mb-1">Tone traits</div>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map((tone) => {
                  const on = form.toneSelections.includes(tone);
                  return (
                    <button
                      key={tone}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? 'bg-white text-black' : 'text-brand-muted hover:text-white'}`}
                      onClick={() => toggleTone(tone)}
                      type="button"
                    >
                      {tone}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm text-brand-muted">Voice description</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.voiceDescription}
                onChange={(e) => updateForm('voiceDescription', e.target.value)}
                placeholder="Human, warm, cozy, a bit playful..."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-brand-muted">Words to use (one per line)</label>
                <textarea
                  className={commonInput}
                  rows={3}
                  value={form.wordsToUse}
                  onChange={(e) => updateForm('wordsToUse', e.target.value)}
                  placeholder="smooth&#10;cozy&#10;city vibe"
                />
              </div>
              <div>
                <label className="text-sm text-brand-muted">Words to avoid</label>
                <textarea
                  className={commonInput}
                  rows={3}
                  value={form.wordsToAvoid}
                  onChange={(e) => updateForm('wordsToAvoid', e.target.value)}
                  placeholder="corporate&#10;formal business language"
                />
              </div>
            </div>
          </div>
        );
      case 'audience':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-brand-muted">Primary audience</label>
              <textarea
                className={commonInput}
                rows={2}
                value={form.primaryAudience}
                onChange={(e) => updateForm('primaryAudience', e.target.value)}
                placeholder="Urban professionals, 22–45, who love good coffee & a relaxing space."
              />
            </div>
            <div>
              <label className="text-sm text-brand-muted">Secondary audience</label>
              <textarea
                className={commonInput}
                rows={2}
                value={form.secondaryAudience}
                onChange={(e) => updateForm('secondaryAudience', e.target.value)}
                placeholder="Students, freelancers, remote workers."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-brand-muted">Pain points (one per line)</label>
                <textarea
                  className={commonInput}
                  rows={3}
                  value={form.painPoints}
                  onChange={(e) => updateForm('painPoints', e.target.value)}
                  placeholder="Want quality coffee without high prices&#10;Want a cozy place to work"
                />
              </div>
              <div>
                <label className="text-sm text-brand-muted">Goals (one per line)</label>
                <textarea
                  className={commonInput}
                  rows={3}
                  value={form.goals}
                  onChange={(e) => updateForm('goals', e.target.value)}
                  placeholder="Build a consistent morning routine&#10;Support local businesses"
                />
              </div>
            </div>
          </div>
        );
      case 'style':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-brand-muted">Color hints (one per line)</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.colorHints}
                onChange={(e) => updateForm('colorHints', e.target.value)}
                placeholder="#2F4F33&#10;Latte cream&#10;Soft beige"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-brand-muted">Heading typography preference</label>
                <input
                  className={commonInput}
                  value={form.typographyHeading}
                  onChange={(e) => updateForm('typographyHeading', e.target.value)}
                  placeholder="Playfair Display"
                />
              </div>
              <div>
                <label className="text-sm text-brand-muted">Body typography preference</label>
                <input
                  className={commonInput}
                  value={form.typographyBody}
                  onChange={(e) => updateForm('typographyBody', e.target.value)}
                  placeholder="Inter"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-brand-muted">Visual inspiration (one per line)</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.visualStyle}
                onChange={(e) => updateForm('visualStyle', e.target.value)}
                placeholder="Warm lighting&#10;Latte art close-ups&#10;Urban city shots"
              />
            </div>
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">
              Upload logos/patterns after generation via the image generator, or drop any notes/links here for AI context.
            </p>
            <textarea
              className={commonInput}
              rows={4}
              value={form.assetNotes}
              onChange={(e) => updateForm('assetNotes', e.target.value)}
              placeholder="Logo is a leaf in a coffee cup. Want to highlight neon sign photos, include QR for menu, etc."
            />
          </div>
        );
      case 'social':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-brand-muted">Social themes or CTA focus (one per line)</label>
              <textarea
                className={commonInput}
                rows={3}
                value={form.socialThemes}
                onChange={(e) => updateForm('socialThemes', e.target.value)}
                placeholder="Seasonal drinks&#10;Community events&#10;Mobile ordering"
              />
            </div>
            <p className="text-sm text-brand-muted">
              Ready? Click “Generate Kit” to build the BrandPilot outputs + downloadable kit.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  const currentStep = steps[stepIdx];

  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">BrandPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Mini brand kit <span className="text-[color:var(--gold,theme(colors.brand.gold))]">in minutes</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Palette, font pairing, voice deck—plus social image presets.
        </p>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex flex-wrap gap-2">
              {steps.map((s, idx) => (
                <button
                  key={s.key}
                  className={`flex-1 min-w-[120px] rounded-md border px-3 py-2 text-sm ${
                    idx === stepIdx ? 'bg-white text-black font-medium' : 'text-brand-muted hover:text-white'
                  }`}
                  onClick={() => setStepIdx(idx)}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-brand-muted">{currentStep.title}</div>
              <p className="text-sm text-brand-muted">{currentStep.desc}</p>
            </div>
            <div className="mt-4">
              {renderStepContent()}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                className="btn-ghost"
                disabled={stepIdx === 0}
                onClick={() => setStepIdx((idx) => Math.max(0, idx - 1))}
              >
                Back
              </button>
              {stepIdx < steps.length - 1 ? (
                <button className="btn-ghost" onClick={() => setStepIdx((idx) => Math.min(steps.length - 1, idx + 1))}>
                  Next
                </button>
              ) : (
                <button className="btn-gold" onClick={handleGenerate} disabled={loading || !form.company.trim() || !form.vibe.trim()}>
                  {loading ? 'Generating…' : 'Generate Kit'}
                </button>
              )}
            </div>
          </div>

          <div className="card p-4">
            {doc ? (
              <>
                {/* Quick preview banner using chosen primary/secondary */}
                <div className="rounded-md overflow-hidden border">
                  <div className="p-4" style={{ background: doc.primary || '#0f172a', color: 'white' }}>
                    <div className="text-xs opacity-80">Preview Header</div>
                    <div
                    className="text-xl font-semibold"
                    style={{ fontFamily: doc.fontPrimary ? `'${doc.fontPrimary}', ui-sans-serif` : undefined }}
                  >
                    {doc.company}
                  </div>
                </div>
                <div className="p-3" style={{ background: doc.secondary || '#334155', color: 'white' }}>
                  <div
                    className="text-sm"
                    style={{ fontFamily: doc.fontSecondary ? `'${doc.fontSecondary}', ui-sans-serif` : undefined }}
                  >
                    Vibe: {doc.vibe}
                  </div>
                    </div>
                  </div>

              <div className="mt-4 text-sm text-brand-muted">Palette (click to set Primary / Secondary)</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {(doc.palette || []).map((hex) => {
                  const isPrimary = doc.primary === hex;
                  const isSecondary = doc.secondary === hex;
                  return (
                    <div key={hex} className="flex flex-col items-center">
                      <button
                        className="w-12 h-12 rounded-md border"
                        style={{ background: hex }}
                        onClick={(e) => {
                          // Left click → primary, Right click → secondary
                          if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.button === 2) {
                            chooseSecondary(hex);
                          } else {
                            choosePrimary(hex);
                          }
                        }}
                        onContextMenu={(e) => { e.preventDefault(); chooseSecondary(hex); }}
                        title={`${hex}\nLeft-click: Primary • Right-click: Secondary`}
                      />
                      <div className="mt-1 text-[10px] text-brand-muted">{hex.toUpperCase()}</div>
                      <div className="text-[10px]">
                        {isPrimary && <span className="text-green-400">Primary</span>}
                        {isSecondary && <span className="text-blue-300">{isPrimary ? ' & ' : ''}Secondary</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-sm text-brand-muted">Fonts (choose a pairing)</div>
              <div className="mt-2 space-y-2">
                {(doc.fonts || []).map((pair) => {
                  const parts = pair.split('+').map(s => s.trim()).filter(Boolean);
                  const [fp, fs] = parts;
                  const selected =
                    (doc.fontPrimary || '') === (fp || pair) &&
                    (doc.fontSecondary || '') === (fs || doc.fontSecondary || '');
                  return (
                    <label key={pair} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fontpair"
                        checked={selected}
                        onChange={() => chooseFontPair(pair)}
                      />
                      <span className="text-sm">{pair}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 text-sm text-brand-muted">Voice (toggle)</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {(doc.voice || []).map((v) => {
                  const on = (doc.voiceSelected || []).includes(v);
                  return (
                    <button
                      key={v}
                      className={`px-2 py-1 rounded-md border text-xs ${on ? 'bg-white text-black' : 'hover:bg-white/5'}`}
                      onClick={() => toggleDocVoice(v)}
                      aria-pressed={on}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-gold" onClick={saveSelections} disabled={loading}>
                  {loading ? 'Saving…' : 'Save Selections'}
                </button>
                <button className="btn-ghost" onClick={handleImages} disabled={loading}>
                  {loading ? 'Working…' : 'Generate Social Images'}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => window.open(`/api/brandpilot/export?id=${doc._id}&format=zip`, "_blank")}
                >
                  Download ZIP
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => window.open(`/api/brandpilot/guide?id=${doc._id}`, "_blank")}
                >
                  Style Guide PDF
                </button>
              </div>
              </>
            ) : (
              <div className="text-sm text-brand-muted">
                Complete the form, then generate your kit to preview palettes, fonts, and assets here.
              </div>
            )}
          </div>
        </div>

        {doc && (doc.summary || doc.voiceGuidelines?.length || doc.messagingPillars?.length || doc.sampleCaptions?.length || doc.sampleEmailIntro || doc.adCopyShort || doc.videoStyle?.length) && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {(doc.summary || doc.slogans?.length) && (
              <div className="card p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-brand-muted">Brand Story</div>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">{doc.summary}</p>
                </div>
                {doc.slogans?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Slogans</div>
                    <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                      {doc.slogans.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {(doc.voiceGuidelines?.length || doc.messagingPillars?.length) && (
              <div className="card p-4 space-y-3">
                {doc.voiceGuidelines?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Voice Guidelines</div>
                    <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                      {doc.voiceGuidelines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {doc.messagingPillars?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Messaging Pillars</div>
                    <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                      {doc.messagingPillars.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {(doc.sampleCaptions?.length || doc.sampleEmailIntro || doc.adCopyShort || doc.adCopyLong) && (
              <div className="card p-4 space-y-3">
                {doc.sampleCaptions?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Sample Captions</div>
                    <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                      {doc.sampleCaptions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {doc.sampleEmailIntro && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Email Intro</div>
                    <p className="text-sm text-white/80 whitespace-pre-line">{doc.sampleEmailIntro}</p>
                  </div>
                )}
                {(doc.adCopyShort || doc.adCopyLong) && (
                  <div className="space-y-2">
                    {doc.adCopyShort && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Ad Copy — Short</div>
                        <p className="text-sm text-white/80">{doc.adCopyShort}</p>
                      </div>
                    )}
                    {doc.adCopyLong && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Ad Copy — Long</div>
                        <p className="text-sm text-white/80 whitespace-pre-line">{doc.adCopyLong}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {doc.videoStyle?.length && (
              <div className="card p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Video Style Directions</div>
                  <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                    {doc.videoStyle.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {doc?.images?.length ? (
          <div className="mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {doc.images.map((img: any, i: number) => (
                <div key={i} className="card p-2">
                  <div className="text-xs text-brand-muted">{img.type}</div>
                  <img src={img.url} alt={img.type} className="rounded mt-1" />
                </div>
              ))}
            </div>

             {/* Show downloads only AFTER images exist */}
            <div className="mt-4 flex gap-2">
              <button
                className="btn-ghost"
                onClick={() => window.open(`/api/brandpilot/export?id=${doc._id}&format=zip`, "_blank")}
              >
                Download ZIP
              </button>
              <button
                className="btn-ghost"
                onClick={() => window.open(`/api/brandpilot/guide?id=${doc._id}`, "_blank")}
              >
                Style Guide PDF
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {doc && (
        <div className="card p-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-brand-muted">Assets</div>
              <div className="text-sm text-brand-muted">Images created for this brand</div>
            </div>
            <button className="btn-ghost text-sm" onClick={() => loadAssets(doc._id)}>
              Refresh
            </button>
          </div>
          {assetsMsg && <div className="mt-2 text-sm text-rose-500">{assetsMsg}</div>}
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {assets.length === 0 && <div className="text-sm text-brand-muted">No assets yet. Generate images to see them here.</div>}
            {assets.map((a) => (
              <div key={a._id} className="border rounded-lg overflow-hidden">
                {a.url ? (
                  <img src={a.url} alt={a.key} className="w-full h-48 object-cover" />
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-brand-muted bg-white/5">No preview</div>
                )}
                <div className="p-2 text-xs text-brand-muted break-all">
                  {a.key}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
