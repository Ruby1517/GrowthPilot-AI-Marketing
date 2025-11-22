'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function AdPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="adpilot">{children}</ModuleGuard>;
}
