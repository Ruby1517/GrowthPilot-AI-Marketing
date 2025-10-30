'use client';

import { useEffect, useState } from 'react';

type Idea = { title: string; angle: string; type: 'trending' | 'evergreen' }
type Section = { type: string; title: string; text: string; ts?: string }
type Doc = {
  _id: string;
  keyword: string;
  ideas: Idea[];
  selectedIdea?: string;
  script?: { title?: string; sections?: Section[]; cta?: string };
  voice?: string;
  tts?: { url?: string };
  video?: { url?: string; status?: string };
  status?: string;
}

export default function ViralPilotPage() {
  const [keyword, setKeyword] = useState('');
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [voice, setVoice] = useState('neutral');
  const [lengthPreset, setLengthPreset] = useState<'short'|'medium'|'full'>('full');

  async function createIdeas() {
    setLoading(true);
    try {
      const r = await fetch('/api/viralpilot/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed');
      setDoc(data.doc);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function generateScript(idea: string) {
    if (!doc?._id) return;
    setLoading(true);
    try {
      const r = await fetch('/api/viralpilot/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc._id, idea }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed');
      setDoc(data.doc);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function generateTTS() {
    if (!doc?._id) return;
    setLoading(true);
    try {
      const r = await fetch('/api/viralpilot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc._id, voice, length: lengthPreset }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.detail || data?.error || `Failed (${r.status})`;
        throw new Error(msg);
      }
      setDoc(data.doc);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function assembleVideo() {
    if (!doc?._id) return;
    setLoading(true);
    try {
      const r = await fetch('/api/viralpilot/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc._id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed');
      // start polling
      setPolling(true);
    } catch (e: any) {
      alert(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!polling || !doc?._id) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/viralpilot/${doc._id}/status`);
      const data = await r.json();
      setDoc(data.project);
      if (data.project?.video?.status === 'ready') {
        setPolling(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [polling, doc?._id]);

  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">ViralPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Turn ideas into a full video <span className="text-[color:var(--gold,theme(colors.brand.gold))]">automatically</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Research topics → write script → generate voice-over → assemble 1080p MP4.
        </p>

        <div className="mt-6 grid md:grid-cols-2 gap-5">
          {/* Left: inputs */}
          <div className="card p-5">
            <div className="text-sm text-brand-muted">Niche keyword</div>
            <input
              className="w-full rounded-md border p-2.5 mt-1"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="personal finance"
            />
            <div className="mt-3 flex gap-2">
              <button className="btn-gold" onClick={createIdeas} disabled={loading || !keyword}>
                {loading ? 'Working…' : 'Get Ideas'}
              </button>
            </div>

            {doc?.ideas?.length ? (
              <>
                <div className="mt-6 text-sm text-brand-muted">Ideas</div>
                <ul className="mt-2 space-y-2">
                  {doc.ideas.map((it, i) => (
                    <li key={i} className="card p-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-sm font-medium">{it.title}</div>
                          <div className="text-xs text-brand-muted">{it.type} • {it.angle}</div>
                        </div>
                        <button className="btn-ghost" onClick={() => generateScript(it.title)}>
                          Use Idea
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Right: script / tts / video */}
          <div className="card p-5 space-y-4">
            <div>
              <div className="text-sm text-brand-muted">Script</div>
              {doc?.script?.sections?.length ? (
                <div className="mt-2">
                  <div className="text-base font-semibold">{doc.script.title || doc.selectedIdea}</div>
                  <div className="mt-2 space-y-2 text-sm">
                    {doc.script.sections.map((s, i) => (
                      <div key={i} className="border rounded p-2">
                        <div className="text-xs text-brand-muted">{s.type}{s.ts ? ` • ${s.ts}` : ''}</div>
                        <div className="font-medium">{s.title}</div>
                        <div className="mt-1 whitespace-pre-wrap">{s.text}</div>
                      </div>
                    ))}
                    {doc.script.cta ? <div className="text-sm italic mt-2">CTA: {doc.script.cta}</div> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-brand-muted">Pick an idea to generate the script.</div>
              )}
            </div>

            <div>
              <div className="text-sm text-brand-muted">Voice</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <select className="border rounded p-2 text-sm" value={voice} onChange={(e) => setVoice(e.target.value)}>
                  <option value="neutral">Neutral</option>
                  <option value="alloy">Alloy (OpenAI)</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
                <select className="border rounded p-2 text-sm" value={lengthPreset} onChange={(e)=>setLengthPreset(e.target.value as any)}>
                  <option value="short">Short (≤600 chars)</option>
                  <option value="medium">Medium (≤1200 chars)</option>
                  <option value="full">Full (no cap)</option>
                </select>
                <button className="btn-ghost" onClick={generateTTS} disabled={loading || !doc?.script?.sections?.length}>
                  {loading ? 'Working…' : 'Generate Voice-Over'}
                </button>
              </div>
              {doc?.tts?.url ? (
                <audio className="mt-3 w-full" controls src={doc.tts.url} />
              ) : null}
            </div>

            <div>
              <div className="text-sm text-brand-muted">Video</div>
              <div className="mt-2 flex gap-2">
                <button className="btn-gold" onClick={assembleVideo} disabled={loading || !doc?.tts?.url}>
                  {loading ? 'Working…' : 'Assemble MP4'}
                </button>
                {doc?.video?.status && <span className="text-sm text-brand-muted self-center">{doc.video.status}</span>}
              </div>
              {doc?.video?.url ? (
                <video className="mt-3 w-full rounded" src={doc.video.url} controls />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
