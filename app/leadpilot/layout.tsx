import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'LeadPilot — Lead Gen Chatbot',
  description: 'Capture and qualify leads with an embeddable AI chatbot using LeadPilot.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children as any
}

