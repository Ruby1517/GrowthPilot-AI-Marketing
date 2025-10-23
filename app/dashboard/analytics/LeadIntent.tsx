'use client';

export default function LeadIntent({ data }: { data?: Array<{ _id: string; count: number }> }) {
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + (d.count || 0), 0) || 1;

  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">LeadPilot Intents (7 days)</div>
      <div className="space-y-2">
        {data.map((d, i) => {
          const pct = Math.round(((d.count || 0) / total) * 100);
          return (
            <div key={i} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="capitalize opacity-80">{d._id || 'other'}</span>
                <span className="text-xs text-brand-muted">{d.count} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded bg-white/10 mt-1">
                <div className="h-1.5 rounded bg-[color:var(--gold,theme(colors.brand.gold))]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

