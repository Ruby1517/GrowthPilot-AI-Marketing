'use client';
import { useState } from 'react';

type InviteRole = 'editor' | 'viewer' | 'manager';

const ROLE_DESCRIPTIONS: Record<InviteRole, string> = {
  editor:  'Can generate and publish content. Cannot manage team.',
  manager: 'Full module access + team management. Cannot touch billing.',
  viewer:  'Read-only. Can see content but cannot generate or publish.',
};

export default function InviteMemberPage() {
  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState<InviteRole>('editor');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [token,   setToken]   = useState<string | null>(null);

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
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invite team member</h1>
        <p className="text-brand-muted text-sm mt-1">They&apos;ll receive a link to join your org.</p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Email address</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-2">Role</label>
          <div className="space-y-2">
            {(['editor','manager','viewer'] as InviteRole[]).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${role === r ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8' : 'border-white/10 hover:border-white/20'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${role === r ? 'bg-[color:var(--gold)]' : 'border border-white/30'}`} />
                <div>
                  <div className="text-sm font-medium capitalize">{r}</div>
                  <div className="text-xs text-brand-muted">{ROLE_DESCRIPTIONS[r]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {err && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{err}</div>}

        <button className="w-full btn-gold py-2.5 text-sm" onClick={submit} disabled={loading || !email}>
          {loading ? 'Creating invite…' : 'Send invite'}
        </button>
      </div>

      {token && (
        <div className="card p-5 space-y-3">
          <div className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Invite created — share this link
          </div>
          <code className="block break-all text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${token}`}
          </code>
          <div className="text-xs text-brand-muted">Valid for 7 days. The recipient must create an account if they don&apos;t have one.</div>
        </div>
      )}
    </div>
  );
}
