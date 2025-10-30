import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'ViralPilot — YouTube Content Creation',
  description: 'Go from ideas to full script, TTS and assembled video with ViralPilot.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

