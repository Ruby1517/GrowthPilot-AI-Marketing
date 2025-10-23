'use client';
import { useState } from 'react';

export default function SeedPricingButton({ visible }: { visible?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!visible) return null;

  async function run() {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/blogpilot/seed-pricing', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to seed');
      setMsg('Seeded pricing KB successfully.');
    } catch (e: any) {
      setMsg(e?.message || 'Failed to seed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-brand-muted">Admin • Knowledge Base</div>
        <button className="btn-ghost" onClick={run} disabled={loading}>
          {loading ? 'Seeding…' : 'Seed Pricing KB'}
        </button>
      </div>
      {msg && <div className="text-xs mt-2">{msg}</div>}
    </div>
  );
}

