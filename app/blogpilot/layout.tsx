import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'BlogPilot — AI SEO Writer',
  description: 'Research and draft SEO-friendly articles with outlines, keywords and facts using BlogPilot.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

