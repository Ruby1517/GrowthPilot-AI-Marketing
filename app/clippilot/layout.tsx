'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import ModuleGuard from '@/components/ModuleGuard';

export default function ClipPilotLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname?.startsWith('/clippilot/landing') ?? false;

  useEffect(() => {
    if (status === 'unauthenticated' && !isLanding) {
      router.replace('/clippilot/landing');
    }
  }, [status, isLanding, router]);

  if (isLanding) return <>{children}</>;
  if (status === 'unauthenticated') return null;

  return <ModuleGuard module="clippilot">{children}</ModuleGuard>;
}
