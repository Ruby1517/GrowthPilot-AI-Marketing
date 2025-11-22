'use client';

import type { ReactNode } from 'react';
import ModuleGuard from '@/components/ModuleGuard';

export default function MailPilotLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="mailpilot">{children}</ModuleGuard>;
}
