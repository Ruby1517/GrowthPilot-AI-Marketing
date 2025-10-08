// app/queue/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';

type Job = {
  _id: string;
  type: string;           // "ClipPilot"
  status: 'queued' | 'processing' | 'done' | 'failed';
  stage?: string;         // probe/transcribe/analyze/render/upload/done/failed
  progress?: number;      // 0..100
  createdAt: string;
  key?: string;           // source key
};

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    const r = await fetch('/api/jobs', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    setJobs(data);
  }

  useEffect(() => {
    load();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const color = (s: Job['status']) =>
    s === 'done' ? 'text-emerald-600' : s === 'failed' ? 'text-rose-600' : 'text-amber-600';

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Jobs</h2>
          <button className="btn-ghost" onClick={load}>Refresh</button>
        </div>

        <ul className="mt-4 divide-y divide-[color:var(--card-stroke,rgba(255,255,255,0.08))]">
          {jobs.map((j) => (
            <li key={j._id} className="py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{j.type}</div>
                  {j.key && <div className="text-xs text-brand-muted truncate max-w-[42rem]">{j.key}</div>}
                </div>
                <div className={`ml-4 ${color(j.status)}`}>
                  {j.status}{j.status !== 'done' && j.status !== 'failed' && j.stage ? ` • ${j.stage}` : ''}
                </div>
              </div>

              {/* progress */}
              {j.status !== 'done' && j.status !== 'failed' && (
                <div className="mt-2 h-1.5 w-full rounded bg-gray-200">
                  <div
                    className="h-1.5 rounded bg-[color:var(--gold,theme(colors.brand.gold))]"
                    style={{ width: `${Math.min(100, Math.max(0, j.progress || 0))}%` }}
                  />
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-brand-muted">
                <span>{new Date(j.createdAt).toLocaleString()}</span>
                <div className="flex gap-2">
                  <a className="btn-ghost" href={`/clips?focus=${j._id}`}>Open in ClipPilot</a>
                  {j.status === 'done' && <a className="btn-gold" href={`/clips?focus=${j._id}`}>Download Clips</a>}
                </div>
              </div>
            </li>
          ))}

          {jobs.length === 0 && (
            <li className="py-6 text-sm text-brand-muted">No jobs yet. Start one from <a className="underline" href="/clips/upload">ClipPilot → Upload Video</a>.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
