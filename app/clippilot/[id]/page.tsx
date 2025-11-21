// app/clips/[id]/page.tsx
import Link from 'next/link';

async function fetchStatus(id: string) {
  const r = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/clippilot/${id}/status`, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}

export default async function ClipDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchStatus(params.id);
  if (!data) return <div className="p-6">Not found</div>;
  return (
    <section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clip #{String(data.id).slice(-8)}</h1>
        <Link href="/dashboard/history" className="btn-ghost">Back</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-sm text-brand-muted">Status: <b className="capitalize">{data.status}</b></div>
          <div className="mt-2 text-sm text-brand-muted">Duration: {Math.round(data.durationSec || 0)}s</div>
          <div className="mt-2 text-sm text-brand-muted">Variants: {data.variants || 1}</div>
        </div>
        <div className="card p-3">
          {data.outputs?.length ? (
            <video
              className="w-full rounded-lg"
              src={data.outputs[0].url}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="p-6 text-brand-muted">No outputs yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

