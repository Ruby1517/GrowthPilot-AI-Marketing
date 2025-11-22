'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function BrandPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="brandpilot">{children}</ModuleGuard>;
}
