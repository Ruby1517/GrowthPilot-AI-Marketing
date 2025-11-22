'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function LeadPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="leadpilot">{children}</ModuleGuard>;
}
