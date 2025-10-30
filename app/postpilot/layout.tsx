import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'PostPilot — AI Social Content',
  description: 'Generate on-brand captions, hashtags, alt text and ideas for social platforms with PostPilot.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

