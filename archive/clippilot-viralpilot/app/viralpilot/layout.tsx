'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function ViralPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="viralpilot">{children}</ModuleGuard>;
}
