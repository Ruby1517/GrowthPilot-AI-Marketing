'use client';

export default function LeadDaily({ data }: { data?: Array<{ _id: string; count: number }> }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.count || 0), 1);
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">LeadPilot Chats (7 days)</div>
      <div className="grid grid-cols-7 gap-2 items-end h-24">
        {data.map((d, i) => {
          const h = Math.round(((d.count || 0) / max) * 100);
          const date = d._id;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 bg-[color:var(--gold,theme(colors.brand.gold))] rounded" style={{ height: `${Math.max(6, h)}%` }} />
              <div className="text-[10px] text-brand-muted">{date.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

