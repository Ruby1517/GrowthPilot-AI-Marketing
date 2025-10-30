import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'MailPilot — AI Email Writer',
  description: 'Draft campaigns and sequences faster with MailPilot’s AI email assistant.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

