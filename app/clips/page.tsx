// // app/clips/page.tsx
// "use client";

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
//       const r = await fetch("/api/clips/list", { cache: "no-store" });
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
//       const r = await fetch(`/api/clips/${id}/assets`, { cache: "no-store" });
//       if (!r.ok) throw new Error(await r.text());
//       const j = await r.json();
//       setAssets((prev) => ({ ...prev, [id]: j.assets || [] }));
//     } catch (e: any) {
//       setMsg(e?.message || "Failed to load assets");
//     }
//   }

//   async function refreshJob(id: string) {
//     try {
//       const r = await fetch(`/api/clips/${id}/status`, { cache: "no-store" });
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
//           <a href="/clips/upload" className="btn-gold">Upload New Video</a>
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
//             <a href="/clips/upload" className="btn-ghost w-full inline-block text-center">New Job</a>
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
'use client';

import { useEffect, useState } from 'react';

export default function ClipsPage() {
  const [src, setSrc] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<'9:16'|'1:1'|'16:9'>('9:16');
  const [durationSec, setDurationSec] = useState(30);
  const [variants, setVariants] = useState(1);

  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('idle');
  const [outputs, setOutputs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setJobId(null); setOutputs([]); setStatus('idle');

    try {
      const res = await fetch('/api/clippilot/create', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ src, prompt, aspect, durationSec, variants }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data?.error || 'Failed');
      setJobId(data.jobId);
      setStatus('queued');
    } catch (e:any) {
      setError(e.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    let t: any;
    const poll = async () => {
      try {
        const r = await fetch(`/api/clippilot/status/${jobId}`);
        if (!r.ok) return;
        const j = await r.json();
        setStatus(j.status);
        setOutputs(j.outputs || []);
        if (j.status === 'done' || j.status === 'error') return; // stop
        t = setTimeout(poll, 2000);
      } catch {}
    };
    poll();
    return () => clearTimeout(t);
  }, [jobId]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">ClipPilot — Video/Shorts Creator</h1>

      <form onSubmit={createJob} className="card p-6 space-y-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2"
          placeholder="Source URL or s3://key"
          value={src}
          onChange={(e)=>setSrc(e.target.value)}
          required
        />
        <textarea
          className="w-full rounded-xl border border-white/10 bg-transparent p-3"
          placeholder="Editing prompt (cuts, captions, music, style)…"
          value={prompt}
          onChange={(e)=>setPrompt(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">Aspect</label>
            <select
              className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={aspect}
              onChange={(e)=>setAspect(e.target.value as any)}
            >
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">Duration</label>
            <input
              type="number" min={5} max={600}
              className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={durationSec}
              onChange={(e)=>setDurationSec(Math.max(5, Math.min(600, Number(e.target.value)||30)))}
            />
            <span className="text-sm text-brand-muted">sec</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">Variants</label>
            <input
              type="number" min={1} max={10}
              className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={variants}
              onChange={(e)=>setVariants(Math.max(1, Math.min(10, Number(e.target.value)||1)))}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-gold" disabled={loading}>
            {loading ? 'Queuing…' : 'Create job'}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </form>

      {jobId && (
        <div className="card p-6 space-y-3">
          <div className="text-sm">Job: <b>{jobId}</b></div>
          <div className="text-sm">Status: <b className="capitalize">{status}</b></div>
          {!!outputs.length && (
            <div className="grid gap-3 md:grid-cols-2">
              {outputs.map((o, i)=>(
                <video key={i} src={o.url} controls className="w-full rounded-xl border border-white/10" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
