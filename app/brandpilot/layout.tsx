import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'BrandPilot — Brand & Design Kit',
  description: 'Manage brand assets, palettes and typography to keep content on-brand.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

