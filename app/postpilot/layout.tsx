'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function PostPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="postpilot">{children}</ModuleGuard>;
}
