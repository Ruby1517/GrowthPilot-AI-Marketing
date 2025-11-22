'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function BlogPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="blogpilot">{children}</ModuleGuard>;
}
