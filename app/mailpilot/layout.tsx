'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import ModuleGuard from '@/components/ModuleGuard';

export default function MailPilotLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname?.startsWith('/mailpilot/landing') ?? false;

  useEffect(() => {
    if (status === 'unauthenticated' && !isLanding) {
      router.replace('/mailpilot/landing');
    }
  }, [status, isLanding, router]);

  if (isLanding) return <>{children}</>;
  if (status === 'unauthenticated') return null;

  return <ModuleGuard module="mailpilot">{children}</ModuleGuard>;
}
