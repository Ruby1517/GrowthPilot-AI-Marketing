'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function ClipPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="clippilot">{children}</ModuleGuard>;
}
