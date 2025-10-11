// app/clips/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ClipDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [status, setStatus] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const s = await fetch(`/api/clips/${id}/status`).then(r=>r.ok?r.json():null);
    const a = await fetch(`/api/clips/${id}/assets`).then(r=>r.ok?r.json():null);
    if (s) setStatus(s);
    if (a) setAssets(a.assets || []);
    setLoading(false);
  }

  useEffect(() => {
    let t:any;
    const poll = async () => {
      await load();
      if (!status || (status && status.status !== 'done' && status.status !== 'error')) {
        t = setTimeout(poll, 2000);
      }
    };
    poll();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !status) return <div className="p-6">Loading…</div>;

  return (
    <section className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clip #{id.slice(-6)}</h1>
        <div className={`px-2 py-1 rounded text-xs capitalize ${
          status?.status === 'done' ? 'bg-green-500/20 text-green-300'
          : status?.status === 'error' ? 'bg-red-500/20 text-red-300'
          : 'bg-yellow-500/20 text-yellow-300'
        }`}>{status?.status}</div>
      </div>

      <div className="card p-6 grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-sm text-brand-muted">Estimate Minutes</div>
          <div className="font-medium">{status?.estimateMinutes ?? 0}</div>
        </div>
        <div>
          <div className="text-sm text-brand-muted">Actual Minutes</div>
          <div className="font-medium">{status?.actualMinutes ?? 0}</div>
        </div>
        <div>
          <div className="text-sm text-brand-muted">Variants</div>
          <div className="font-medium">{status?.variants ?? 1}</div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">Assets</h2>
        {!assets.length && <div className="text-sm text-brand-muted">No outputs yet.</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((a, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-3">
              <video className="w-full rounded-lg" src={a.url} controls />
              <div className="mt-2 text-xs text-brand-muted flex items-center justify-between">
                <span>Variant #{a.index ?? i}</span>
                <span>{a.durationSec ? `${a.durationSec}s` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {status?.error && (
        <div className="card p-6 text-red-300">
          <div className="font-semibold">Error</div>
          <div className="text-sm">{status.error}</div>
        </div>
      )}
    </section>
  );
}
