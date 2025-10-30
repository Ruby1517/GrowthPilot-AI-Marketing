import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'AdPilot — Ads Optimizer',
  description: 'Create and iterate on high-performing ad variants with AdPilot.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

