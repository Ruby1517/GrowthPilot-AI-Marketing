'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/access';
import { moduleLabels, modulePlan, type ModuleKey, type Plan } from '@/lib/modules';

type Props = { module: ModuleKey; children: ReactNode };

export default function ModuleGuard({ module, children }: Props) {
  const { data: session, status } = useSession();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') {
      setPlan(null);
      setRole(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        setLoading(true);
        const r = await fetch('/api/org/settings', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          const eff = (j.effectivePlan as Plan) || (j.plan as Plan) || 'Trial';
          if (!cancelled) {
            setPlan(eff);
            setRole((j.myRole as any) || null);
          }
        } else if (!cancelled) {
          // fall back to Trial if org settings cannot be read
          setPlan('Trial');
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // If authenticated but plan not yet loaded, default to Trial so Trial modules stay open.
  const userPlan = status === 'authenticated' ? (plan ?? 'Trial') : null;
  const required = modulePlan[module];
  const unlocked = canAccess({ userPlan: userPlan as any, module, userRole: role ?? undefined });

  if (status === 'loading' || loading) {
    return (
      <div className="card p-6">
        <div className="h-4 w-28 bg-white/10 rounded" />
        <div className="mt-2 h-5 w-48 bg-white/10 rounded" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="card p-6">
        <div className="text-lg font-semibold">Sign in required</div>
        <p className="text-brand-muted mt-2">Please sign in to access {moduleLabels[module]}.</p>
        <Link href="/api/auth/signin" className="btn-gold mt-4 inline-block">
          Sign In
        </Link>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="card p-6">
        <div className="text-lg font-semibold">{moduleLabels[module]}</div>
        <p className="text-brand-muted mt-2">
          This module requires the {required} plan. Upgrade to unlock it for your team.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/billing" className="btn-gold">
            Upgrade plan
          </Link>
          <Link href="/" className="btn-ghost">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
