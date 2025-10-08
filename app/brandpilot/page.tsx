'use client';

import { useState } from 'react';

type BrandDoc = {
  _id: string;
  company: string;
  vibe: string;
  palette?: string[];
  fonts?: string[];
  voice?: string[];
  images?: Array<{type:string; url:string}>;
  primary?: string;
  secondary?: string;
  fontPrimary?: string;
  fontSecondary?: string;
  voiceSelected?: string[];
};

export default function BrandPilotPage() {
  const [company, setCompany] = useState('');
  const [vibe, setVibe] = useState('');
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<BrandDoc | null>(null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/brandpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, vibe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate');
      setDoc(data.doc);
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
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  // === NEW: selections ===
  function toggleVoice(v: string) {
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
            <div className="text-sm text-brand-muted mb-1">Company</div>
            <input
              className="w-full rounded-md border p-2.5"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme, Inc."
            />
            <div className="mt-3 text-sm text-brand-muted mb-1">Vibe words</div>
            <input
              className="w-full rounded-md border p-2.5"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="modern, playful, premium"
            />
            <div className="mt-4 flex gap-2 flex-wrap">
              <button className="btn-gold" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating…' : 'Generate Kit'}
              </button>
              {!!doc && (
                <button className="btn-ghost" onClick={handleImages} disabled={loading}>
                  {loading ? 'Working…' : 'Generate Social Images'}
                </button>
              )}
              {!!doc && (
                <>
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
                </>
              )}
            </div>
          </div>

          {doc && (
            <div className="card p-4">
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
                      onClick={() => toggleVoice(v)}
                      aria-pressed={on}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <button className="btn-gold" onClick={saveSelections} disabled={loading}>
                  {loading ? 'Saving…' : 'Save Selections'}
                </button>
              </div>
            </div>
          )}
        </div>

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
    </section>
  );
}
