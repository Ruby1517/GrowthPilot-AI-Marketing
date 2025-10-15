'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InviteLanding() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [token, setToken] = useState('');
  const [orgName, setOrgName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Only run client-side
    const u = new URL(window.location.href);
    setToken(u.searchParams.get('token') || '');
    // Try to read next-auth session
    fetch('/api/auth/session').then(r => r.json()).then(setSession).catch(()=>setSession(null));
    // Fetch org name for invite
    if (token) {
      fetch('/api/invites/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        .then(r => r.json()).then(j => { if (j?.ok) setOrgName(j.orgName || 'Organization'); })
        .catch(()=>{});
    }
  }, []);

  async function accept() {
    if (!token) return;
    setStatus('loading'); setMessage('');
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Please sign in first.');
      const res = await fetch('/api/invites/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to accept invite');
      setStatus('done');
      setMessage('Invite accepted! Redirecting to dashboard…');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Failed to accept invite');
    }
  }

  return (
    <section className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Organization Invite</h1>
      {!mounted ? (
        <div className="text-sm text-brand-muted">Loading…</div>
      ) : (
        <>
          {!token && <div className="text-sm text-red-500">Invalid invite link.</div>}
          {token && (
            <div className="space-y-3">
              <div className="text-sm text-brand-muted">You have been invited to join <b>{orgName || 'this organization'}</b>.</div>
              {!session?.user && (
                <a className="btn-gold inline-block" href={`/auth/signin?callbackUrl=${encodeURIComponent('/invite?token=' + token)}`}>
                  Sign in to continue
                </a>
              )}
              {session?.user && (
                <button className="btn-gold" onClick={accept} disabled={status==='loading'}>
                  {status === 'loading' ? 'Accepting…' : 'Accept Invite'}
                </button>
              )}
              {message && <div className="text-sm">{message}</div>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
