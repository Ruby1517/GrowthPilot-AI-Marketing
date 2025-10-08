import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import AuthSessionProvider from '@/components/AuthSessionProvider'

export const metadata = {
  title: 'GrowthPilot — AI Suite',
  description: 'All-in-one AI marketing suite',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthSessionProvider>
          <div className="mx-auto max-w-6xl px-6">
            <Navbar />
            <main className="py-8">{children}</main>
            <footer className="py-10 text-center text-sm text-brand-muted">
              © {new Date().getFullYear()} GrowthPilot
            </footer>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
