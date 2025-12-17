'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import ModuleGuard from '@/components/ModuleGuard';

export default function PostPilotLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname?.startsWith('/postpilot/landing') ?? false;

  useEffect(() => {
    if (status === 'unauthenticated' && !isLanding) {
      router.replace('/postpilot/landing');
    }
  }, [status, isLanding, router]);

  if (isLanding) return <>{children}</>;
  if (status === 'unauthenticated') return null;

  return <ModuleGuard module="postpilot">{children}</ModuleGuard>;
}
