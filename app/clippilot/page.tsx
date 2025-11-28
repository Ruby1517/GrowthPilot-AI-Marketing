"use client";

// import { useEffect, useMemo, useRef, useState } from "react";

// type ClipJob = {
//   _id: string;
//   status: "queued" | "processing" | "done" | "failed";
//   stage: "queued" | "probe" | "transcribe" | "analyze" | "render" | "upload" | "done" | "failed";
//   progress: number; // 0..100
//   error?: string;
//   source: { key: string; bucket: string; region: string; duration?: number };
//   createdAt: string;
// };

// type ClipAsset = {
//   idx: number;
//   title?: string;
//   thumbText?: string;
//   srt: string | null;
//   mp4_916: string | null;
//   mp4_11: string | null;
// };

// export default function ClipsPage() {
//   const [jobs, setJobs] = useState<ClipJob[]>([]);
//   const [focusId, setFocusId] = useState<string | null>(null);
//   const [assets, setAssets] = useState<Record<string, ClipAsset[]>>({});
//   const [loading, setLoading] = useState(true);
//   const [msg, setMsg] = useState<string | null>(null);

//   const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   // read focus from query
//   useEffect(() => {
//     const qs = new URLSearchParams(window.location.search);
//     const f = qs.get("focus");
//     if (f) setFocusId(f);
//   }, []);

//   async function loadJobs() {
//     setLoading(true);
//     try {
//       const r = await fetch("/api/clippilot/list", { cache: "no-store" });
//       if (!r.ok) throw new Error(await r.text());
//       const j = await r.json();
//       setJobs(j.jobs || []);
//       // set focus to most recent if none chosen
//       if (!focusId && j.jobs?.length) setFocusId(j.jobs[0]._id);
//     } catch (e: any) {
//       setMsg(e?.message || "Failed to load jobs");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function loadAssets(id: string) {
//     try {
//       const r = await fetch(`/api/clippilot/${id}/assets`, { cache: "no-store" });
//       if (!r.ok) throw new Error(await r.text());
//       const j = await r.json();
//       setAssets((prev) => ({ ...prev, [id]: j.assets || [] }));
//     } catch (e: any) {
//       setMsg(e?.message || "Failed to load assets");
//     }
//   }

//   async function refreshJob(id: string) {
//     try {
//       const r = await fetch(`/api/clippilot/${id}/status`, { cache: "no-store" });
//       if (!r.ok) return;
//       const j = await r.json();
//       setJobs((prev) => prev.map((x) => (x._id === id ? j.job : x)));
          
//       if (j.job.status === "done") {
//         await loadAssets(id);
//         // stop polling once done
//         if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
//       }
//     } catch {}
//   }

//   // initial load
//   useEffect(() => {
//     loadJobs();
//   }, []);

//   // poll focused job every 5s until done/failed
//   useEffect(() => {
//     if (pollRef.current) {
//     clearInterval(pollRef.current);
//     pollRef.current = null;
//   }
//     if (!focusId) return;

//     const current = jobs.find((j) => j._id === focusId);
//     if (current && (current.status === "done" || current.status === "failed")) return;

//     const tick = () => {
//     if (document.visibilityState === "visible") {
//       refreshJob(focusId); // your existing function
//     }
//   };

//   // run once immediately, then every 5s while visible
//   tick();
//   pollRef.current = setInterval(tick, 5000);

//   // clean up on dependency change/unmount
//   return () => {
//     if (pollRef.current) {
//       clearInterval(pollRef.current);
//       pollRef.current = null;
//     }
//   };
//   }, [focusId, jobs]);

//   const focused = useMemo(() => jobs.find((j) => j._id === focusId) || null, [jobs, focusId]);

//   // UI helpers
//   const statusClass = (s: ClipJob["status"]) =>
//     s === "done" ? "text-emerald-600" : s === "failed" ? "text-rose-600" : "text-amber-600";

//   return (
//     <section className="relative overflow-hidden">
//       {/* Header */}
//       <div className="card p-8 md:p-12">
//         <span className="badge mb-4">ClipPilot</span>
//         <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
//           AI Shorts Creator <span className="text-[color:var(--gold,theme(colors.brand.gold))]">pipeline</span>
//         </h1>
//         <p className="mt-3 max-w-2xl text-brand-muted">
//           Generate highlighted clips with subtitles in 9:16 and 1:1, plus SRT files and title/thumbnail ideas.
//         </p>
//         <div className="mt-6 flex gap-3">
//           <a href="/clippilot/upload" className="btn-gold">Upload New Video</a>
//           <button className="btn-ghost" onClick={loadJobs}>Refresh</button>
//         </div>
//         {msg && <div className="mt-4 rounded-md border px-3 py-2 text-sm bg-gray-50">{msg}</div>}
//       </div>

//       {/* Two-column layout */}
//       <div className="mt-8 grid gap-6 md:grid-cols-[280px,1fr]">
//         {/* Sidebar: Jobs list */}
//         <aside className="card p-5 h-fit sticky top-4">
//           <div className="text-sm text-brand-muted mb-2">Jobs</div>
//           <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
//             {jobs.map((j) => (
//               <button
//                 key={j._id}
//                 onClick={() => { setFocusId(j._id); if (j.status === "done") loadAssets(j._id); }}
//                 className={`w-full text-left rounded-md border px-3 py-2 transition
//                   ${focusId === j._id ? "border-[color:var(--gold,theme(colors.brand.gold))] bg-amber-50/40" : "hover:bg-gray-50"}`}
//               >
//                 <div className="text-xs text-brand-muted flex justify-between">
//                   <span>{j.source.bucket} • {j.source.region}</span>
//                   <span>{new Date(j.createdAt).toLocaleDateString()}</span>
//                 </div>
//                 <div className="mt-1 text-sm break-all line-clamp-2">{j.source.key}</div>
//                 <div className={`mt-1 text-xs ${statusClass(j.status)}`}>
//                   {j.status} {j.status !== "done" && j.status !== "failed" ? `• ${j.stage}` : ""}
//                 </div>
//                 {/* mini progress bar */}
//                 {j.status !== "done" && j.status !== "failed" && (
//                   <div className="mt-2 h-1.5 w-full rounded bg-gray-200">
//                     <div className="h-1.5 rounded bg-[color:var(--gold,theme(colors.brand.gold))]" style={{ width: `${Math.min(100, Math.max(0, j.progress || 0))}%` }} />
//                   </div>
//                 )}
//               </button>
//             ))}

//             {loading && Array.from({ length: 4 }).map((_, i) => (
//               <div key={`sk-${i}`} className="rounded-md border px-3 py-3">
//                 <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
//                 <div className="mt-2 h-3 w-56 rounded bg-gray-200 animate-pulse" />
//                 <div className="mt-3 h-1.5 w-full rounded bg-gray-200 animate-pulse" />
//               </div>
//             ))}
//           </div>
//           <div className="mt-3">
//             <a href="/clippilot/upload" className="btn-ghost w-full inline-block text-center">New Job</a>
//           </div>
//         </aside>

//         {/* Main: Focused job & outputs */}
//         <main className="space-y-6">
//           {focused ? (
//             <div className="card p-5">
//               <div className="flex flex-wrap items-center gap-2">
//                 <span className="badge">Focused Job</span>
//                 <div className="text-sm text-brand-muted">{focused.source.key}</div>
//                 <div className="ml-auto text-sm">
//                   Status: <b className={statusClass(focused.status)}>{focused.status}</b>
//                   {focused.status !== "done" && focused.status !== "failed" && (
//                     <span className="text-brand-muted"> • {focused.stage}</span>
//                   )}
//                 </div>
//               </div>

//               {/* Progress bar */}
//               {focused.status !== "done" && focused.status !== "failed" && (
//                 <div className="mt-4">
//                   <div className="h-2.5 w-full rounded bg-gray-200">
//                     <div
//                       className="h-2.5 rounded bg-[color:var(--gold,theme(colors.brand.gold))] transition-[width] duration-500"
//                       style={{ width: `${Math.min(100, Math.max(0, focused.progress || 0))}%` }}
//                     />
//                   </div>
//                   <div className="mt-1 text-xs text-brand-muted">
//                     {focused.stage} • {Math.round(focused.progress || 0)}%
//                   </div>
//                 </div>
//               )}
//               {focused.error && <div className="mt-2 text-sm text-rose-600">Error: {focused.error}</div>}

//               {/* Clip assets */}
//               <div className="mt-5 grid gap-6 md:grid-cols-3">
//                 {(assets[focused._id] || []).map((c) => (
//                   <div key={c.idx} className="card p-5">
//                     <div className="text-sm text-brand-muted">Clip #{c.idx + 1}</div>
//                     {c.title && <div className="mt-1 text-lg font-medium">{c.title}</div>}
//                     {c.thumbText && <div className="mt-1 text-xs text-brand-muted">Thumb: {c.thumbText}</div>}

//                     <div className="mt-4 flex flex-wrap gap-2">
//                       {c.mp4_916 && (
//                         <a className="btn-gold" href={c.mp4_916} target="_blank" rel="noreferrer">
//                           Download 9:16
//                         </a>
//                       )}
//                       {c.mp4_11 && (
//                         <a className="btn-ghost" href={c.mp4_11} target="_blank" rel="noreferrer">
//                           Download 1:1
//                         </a>
//                       )}
//                       {c.srt && (
//                         <a className="btn-ghost" href={c.srt} target="_blank" rel="noreferrer">
//                           SRT
//                         </a>
//                       )}
//                     </div>
//                   </div>
//                 ))}

//                 {focused.status !== "done" &&
//                   (!assets[focused._id] || assets[focused._id].length === 0) && (
//                     <div className="text-sm text-brand-muted p-5">
//                       Clips will appear here once processing is complete…
//                     </div>
//                   )}
//               </div>
//             </div>
//           ) : (
//             <div className="card p-5">
//               <div className="text-sm text-brand-muted">Select a job from the left to view details.</div>
//             </div>
//           )}
//         </main>
//       </div>
//     </section>
//   );
// }


// app/clips/page.tsx
// 'use client';

// import { useEffect, useState } from 'react';

// export default function ClipsPage() {
//   const [src, setSrc] = useState('');
//   const [prompt, setPrompt] = useState('');
//   const [aspect, setAspect] = useState<'9:16'|'1:1'|'16:9'>('9:16');
//   const [durationSec, setDurationSec] = useState(30);
//   const [variants, setVariants] = useState(1);

//   const [jobId, setJobId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<string>('idle');
//   const [outputs, setOutputs] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   async function createJob(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true); setError(null); setJobId(null); setOutputs([]); setStatus('idle');

//     try {
//       const res = await fetch('/api/clippilot/create', {
//         method: 'POST',
//         headers: { 'content-type':'application/json' },
//         body: JSON.stringify({ src, prompt, aspect, durationSec, variants }),
//       });
//       const data = await res.json();
//       if (!res.ok || data.ok === false) throw new Error(data?.error || 'Failed');
//       setJobId(data.jobId);
//       setStatus('queued');
//     } catch (e:any) {
//       setError(e.message || 'Failed to create job');
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     if (!jobId) return;
//     let t: any;
//     const poll = async () => {
//       try {
//         const r = await fetch(`/api/clippilot/status/${jobId}`);
//         if (!r.ok) return;
//         const j = await r.json();
//         setStatus(j.status);
//         setOutputs(j.outputs || []);
//         if (j.status === 'done' || j.status === 'error') return; // stop
//         t = setTimeout(poll, 2000);
//       } catch {}
//     };
//     poll();
//     return () => clearTimeout(t);
//   }, [jobId]);

//   return (
//     <div className="p-6 space-y-6 max-w-3xl">
//       <h1 className="text-2xl font-semibold">ClipPilot — Video/Shorts Creator</h1>

//       <form onSubmit={createJob} className="card p-6 space-y-4">
//         <input
//           className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2"
//           placeholder="Source URL or s3://key"
//           value={src}
//           onChange={(e)=>setSrc(e.target.value)}
//           required
//         />
//         <textarea
//           className="w-full rounded-xl border border-white/10 bg-transparent p-3"
//           placeholder="Editing prompt (cuts, captions, music, style)…"
//           value={prompt}
//           onChange={(e)=>setPrompt(e.target.value)}
//         />
//         <div className="grid gap-3 md:grid-cols-3">
//           <div className="flex items-center gap-2">
//             <label className="text-sm w-24">Aspect</label>
//             <select
//               className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
//               value={aspect}
//               onChange={(e)=>setAspect(e.target.value as any)}
//             >
//               <option value="9:16">9:16</option>
//               <option value="1:1">1:1</option>
//               <option value="16:9">16:9</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <label className="text-sm w-24">Duration</label>
//             <input
//               type="number" min={5} max={600}
//               className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
//               value={durationSec}
//               onChange={(e)=>setDurationSec(Math.max(5, Math.min(600, Number(e.target.value)||30)))}
//             />
//             <span className="text-sm text-brand-muted">sec</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <label className="text-sm w-24">Variants</label>
//             <input
//               type="number" min={1} max={10}
//               className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
//               value={variants}
//               onChange={(e)=>setVariants(Math.max(1, Math.min(10, Number(e.target.value)||1)))}
//             />
//           </div>
//         </div>

//         <div className="flex gap-2">
//           <button className="btn-gold" disabled={loading}>
//             {loading ? 'Queuing…' : 'Create job'}
//           </button>
//           {error && <span className="text-sm text-red-400">{error}</span>}
//         </div>
//       </form>

//       {jobId && (
//         <div className="card p-6 space-y-3">
//           <div className="text-sm">Job: <b>{jobId}</b></div>
//           <div className="text-sm">Status: <b className="capitalize">{status}</b></div>
//           {!!outputs.length && (
//             <div className="grid gap-3 md:grid-cols-2">
//               {outputs.map((o, i)=>(
//                 <video key={i} src={o.url} controls className="w-full rounded-xl border border-white/10" />
//               ))}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


// Removed stale duplicate implementation below to avoid duplicate exports/imports

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import ModuleComingSoon from '@/components/ModuleComingSoon';
import { moduleStatus } from '@/lib/modules';
import Uploader from '@/components/Uploader';

type Item = {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  durationSec: number;
  variants: number;
  estimateMinutes?: number;
  actualMinutes?: number;
  createdAt: string;
};

type Aspect = '9:16' | '1:1' | '16:9';

const clipComingSoon = moduleStatus.clippilot !== 'live';

export default function ClipPilotPage() {
  if (clipComingSoon) {
    return (
      <ModuleComingSoon
        moduleName="ClipPilot"
        tagline="turns long videos into viral-ready shorts automatically"
        description="ClipPilot takes any long video and returns social-ready shorts with sharp captions, zoom/punch-ins, hooks, and music in the right aspect ratios. Perfect for creators, businesses, coaches, agencies, influencers, or anyone producing short videos."
        highlights={[
          'Smart scene detection plus clean, auto-generated captions',
          'Auto zoom/punch effects with AI soundtrack and B-roll suggestions',
          'Exports sized for TikTok, Reels, and Shorts with hooks and titles baked in',
        ]}
        etaLabel="Back mid-release"
        ctaHref="/postpilot"
        ctaLabel="Work with the live modules"
      />
    );
  }
  return <ClipsHome />;
}

function ClipsHome() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session as any)?.user?.orgId as string | undefined, [session]);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // shared
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [variants] = useState<number>(1);

  // Branding settings
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  const [subtitleBg, setSubtitleBg] = useState('#000000');
  const [progressEnabled, setProgressEnabled] = useState(true);
  const [progressColor, setProgressColor] = useState('#ffffff');
  const [watermarkText, setWatermarkText] = useState('');
  const [musicUrl, setMusicUrl] = useState('');

  // Video
  const [srcUrl, setSrcUrl] = useState('');
  const [storageKey, setStorageKey] = useState(''); // if private upload

  async function refresh() {
    try {
      setErr(null);
      const r = await fetch('/api/clippilot/list');
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load jobs');
    }
  }

  useEffect(() => { refresh(); }, []);
  async function loadDetail(id: string) {
    try {
      const r = await fetch(`/api/clippilot/${id}/status`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to load status');
      setDetail(j);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load status');
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (status === 'loading') return; // wait for session
    if (!orgId) {
      setErr('No organization found for your account. Please select or create an org.');
      return;
    }

    // build payload (video only)
    if (!srcUrl.trim() && !storageKey) {
      setErr('Paste a video URL or upload a file.');
      return;
    }
    const payload: any = {
      orgId,
      aspect,
      variants,
      mode: 'video',
      branding: {
        subtitles: {
          color: subtitleColor,
          background: subtitleBg,
        },
        progressBar: {
          enabled: progressEnabled,
          color: progressColor,
        },
        watermark: {
          text: watermarkText,
        },
        music: musicUrl,
      },
      ...(srcUrl.trim() ? { srcUrl } : {}),
      ...(storageKey ? { storageKey } : {}),
    };

    setLoading(true);
    try {
      const r = await fetch('/api/clippilot/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        // surface server-side structured errors if present
        const msg =
          j?.error === 'usage_limit' && j?.details?.reason
            ? `Usage limit: ${j.details.reason}`
            : j?.error || `Create failed (${r.status})`;
        throw new Error(msg);
      }

      // reset form fields
      setSrcUrl('');
      setStorageKey('');

      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !(srcUrl.trim() || storageKey);

  return (
    <section className="p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">ClipPilot — Viral-ready Shorts</h1>
        <a href="/clippilot/dashboard" className="btn-ghost text-sm">Open Publishing Dashboard</a>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">What ClipPilot Does</h2>
        <p className="text-sm text-brand-muted">
          ClipPilot turns any long video into viral-ready short-form videos with:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Smart scene detection that pulls the best moments automatically</li>
          <li>Auto captions with clean styling for every platform</li>
          <li>Auto zoom/punch effects that keep pacing snappy</li>
          <li>AI soundtrack/music and on-beat transitions</li>
          <li>B-roll suggestions to cover jump cuts</li>
          <li>Hooks and titles for thumb-stopping intros</li>
          <li>Social-optimized formats for TikTok, Reels, and Shorts</li>
        </ul>
        <div className="text-sm text-brand-muted">
          Perfect for creators, businesses, coaches, agencies, influencers, or anyone producing short videos.
        </div>
      </div>

      {/* From Video only */}

      <form onSubmit={onCreate} className="card p-6 space-y-4">
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm">Upload a file</label>
              <Uploader
                projectId={undefined /* TODO: wire your project/org id if needed */}
                onComplete={({ url, key }) => {
                  if (key) {
                    setStorageKey(key);
                  }
                  if (url) {
                    setSrcUrl(url);
                  } else if (process.env.NEXT_PUBLIC_CDN_BASE && key) {
                    const base = process.env.NEXT_PUBLIC_CDN_BASE.replace(/\/+$/, '');
                    setSrcUrl(`${base}/${key}`);
                  } else {
                    setSrcUrl(''); // rely on storageKey for private buckets
                  }
                }}
              />
              {storageKey && !srcUrl && (
                <div className="text-xs text-brand-muted break-all">
                  Uploaded (private): {storageKey}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm">Or paste video URL</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://… (MP4/MOV/WEBM)"
                value={srcUrl}
                onChange={(e) => setSrcUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-28">Aspect</label>
              <select
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                value={aspect}
                onChange={(e) => setAspect(e.target.value as Aspect)}
              >
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-4 space-y-4 bg-black/10">
            <p className="text-sm font-medium">Branding & Style</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 text-sm">
                <span className="w-32">Subtitle Color</span>
                <input type="color" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <span className="w-32">Subtitle BG</span>
                <input type="color" value={subtitleBg} onChange={(e) => setSubtitleBg(e.target.value)} />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <span className="w-32">Progress Bar</span>
                <input
                  type="checkbox"
                  checked={progressEnabled}
                  onChange={(e) => setProgressEnabled(e.target.checked)}
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <span className="w-32">Progress Color</span>
                <input type="color" value={progressColor} onChange={(e) => setProgressColor(e.target.value)} disabled={!progressEnabled} />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm">Watermark text</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., @YourBrand"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Background music URL (optional)</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="https://… (MP3)"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </>

        <div className="flex items-center gap-3">
          <button className="btn-gold" disabled={disabled}>
            {loading ? 'Queuing…' : 'Create'}
          </button>
          {err && <span className="text-sm text-red-400">{err}</span>}
        </div>
      </form>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Jobs</h2>
          <button className="btn-gold" onClick={refresh}>Refresh</button>
        </div>

        <div className="mt-3 divide-y divide-white/10">
          {items.length === 0 && <div className="text-sm text-brand-muted py-4">No jobs yet.</div>}
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between py-3 hover:bg-white/5 rounded-md px-2">
              <div className="flex items-center gap-3">
                <div
                  className={`px-2 py-1 rounded text-xs capitalize ${ 
                    it.status === 'done'
                      ? 'bg-green-500/20 text-green-300'
                      : it.status === 'error'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {it.status}
                </div>
                <div className="text-sm opacity-80">
                  ~{Math.ceil((it.durationSec || 0) / 60)} min, {it.variants} variant{it.variants > 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-brand-muted">
                  {new Date(it.createdAt).toLocaleString()}
                </div>
                <button className="btn-ghost" onClick={() => { setSelectedId(it.id); loadDetail(it.id); }}>
                  View Inline
                </button>
                <a className="btn-ghost" href={`/clippilot/dashboard#${it.id}`} target="_blank" rel="noopener noreferrer">
                  Dashboard
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

          {selectedId && (
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Job Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost text-red-600 border-red-300 hover:bg-red-50"
                    onClick={async () => {
                      if (!selectedId) return;
                      const sure = window.confirm('Delete this job and its outputs? This cannot be undone.');
                      if (!sure) return;
                      try {
                        const r = await fetch(`/api/clippilot/${selectedId}`, { method: 'DELETE' });
                        if (!r.ok) {
                          const j = await r.json().catch(() => ({}));
                          throw new Error(j?.error || `Delete failed (${r.status})`);
                        }
                        // Close panel and refresh list
                        setSelectedId(null);
                        setDetail(null);
                        await refresh();
                      } catch (e:any) {
                        alert(e?.message || 'Failed to delete');
                      }
                    }}
                  >
                    Delete
                  </button>
                  {detail?.status !== 'done' && (
                    <button
                      className="btn-gold"
                      onClick={async () => {
                        if (!selectedId) return;
                        await fetch(`/api/clippilot/${selectedId}/process`, { method: 'POST' });
                        await loadDetail(selectedId);
                      }}
                    >
                      Process Now
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => { setSelectedId(null); setDetail(null); }}>Close</button>
                </div>
              </div>
          {!detail && <div className="text-sm text-brand-muted mt-2">Loading…</div>}
          {detail && (
            <div className="mt-3 space-y-3">
              <div className="text-sm">Status: <b className="capitalize">{detail.status}</b></div>
              <div className="text-sm text-brand-muted">Est: {detail.estimateMinutes}m • Actual: {detail.actualMinutes}m</div>
              <div className="grid gap-4 md:grid-cols-3">
                {(detail.outputs || []).map((o:any) => (
                  <div key={o.index} className="card p-4">
                    <div className="text-sm text-brand-muted">Clip #{o.index + 1}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.url && <a className="btn-gold" href={o.url} target="_blank" rel="noreferrer">Download</a>}
                      {o.thumb && <a className="btn-ghost" href={o.thumb} target="_blank" rel="noreferrer">Thumb</a>}
                      {typeof o.durationSec === 'number' && <span className="text-xs text-brand-muted">{o.durationSec}s</span>}
                    </div>
                  </div>
                ))}
                {(!detail.outputs || !detail.outputs.length) && (
                  <div className="text-sm text-brand-muted p-4">Outputs will appear once processing completes…</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
