'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ModuleGuard from '@/components/ModuleGuard';

export default function Layout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
    }
  }, [status, router]);

  if (status === 'unauthenticated') return null;

  return <ModuleGuard module="blogpilot">{children}</ModuleGuard>;
}
