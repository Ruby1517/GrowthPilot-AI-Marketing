'use client';
import { useState } from 'react';

export default function InviteMemberPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member'|'viewer'|'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setErr(null); setToken(null);
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to create invite');
      setToken(j.token);
    } catch (e: any) {
      setErr(e?.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Invite Member</h1>

      <div className="space-y-3">
        <input
          className="w-full rounded-md border p-2 bg-transparent"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="w-full rounded-md border p-2 bg-transparent"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn-gold" onClick={submit} disabled={loading || !email}>
          {loading ? 'Sending…' : 'Send Invite'}
        </button>
        {err && <div className="text-sm text-red-500">{err}</div>}
      </div>

      {token && (
        <div className="card p-4 space-y-2">
          <div className="text-sm text-brand-muted">Invitation created. Share this link:</div>
          <code className="block break-all text-xs">
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${token}`}
          </code>
          <div className="text-xs text-brand-muted">Valid for 7 days.</div>
        </div>
      )}
    </section>
  );
}

