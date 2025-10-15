'use client';
import { useEffect, useState } from 'react';

type Invite = { _id: string; email: string; role: string; token: string; expiresAt: string };

export default function PendingInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/invites/list');
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to load invites');
      setInvites(j.invites || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    const r = await fetch('/api/invites/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) load();
  }

  async function resend(id: string) {
    const r = await fetch('/api/invites/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await r.json();
    if (r.ok && j?.token) {
      navigator.clipboard?.writeText(`${window.location.origin}/invite?token=${j.token}`).catch(()=>{});
      alert('Invite link copied to clipboard');
    }
  }

  if (loading) return <div className="text-sm text-brand-muted">Loading…</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!invites.length) return <div className="text-sm text-brand-muted">No pending invites.</div>;

  return (
    <ul className="space-y-2">
      {invites.map((i) => (
        <li key={i._id} className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2">
          <div>
            <div className="text-sm">{i.email}</div>
            <div className="text-xs text-brand-muted">Expires {new Date(i.expiresAt).toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => resend(i._id)}>Resend</button>
            <button className="btn-ghost" onClick={() => revoke(i._id)}>Revoke</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

