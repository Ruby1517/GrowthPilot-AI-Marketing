// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import Navbar from '@/components/Navbar';
import StudioSidebar from '@/components/StudioSidebar';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import SupportChat from '@/components/SupportChat';
import DemoModeBanner from '@/components/DemoModeBanner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: {
    default: 'GrowthPilot — AI Marketing Suite',
    template: '%s — GrowthPilot',
  },
  description: 'Create posts, blogs, ads, emails & clips 10× faster with GrowthPilot — an all‑in‑one AI marketing suite.',
  applicationName: 'GrowthPilot',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'GrowthPilot',
    title: 'GrowthPilot — AI Marketing Suite',
    description: 'All-in-one AI suite for social posts, blogs, ads, email and video.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrowthPilot — AI Marketing Suite',
    description: 'All-in-one AI suite for social posts, blogs, ads, email and video.',
    creator: '@growthpilot',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/favicon.svg'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0b' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Optional: set dark class before hydration to prevent theme flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
                (function() {
                  try {
                    var t = localStorage.getItem('theme');
                    var s = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (t === 'dark' || (t === 'system' && s) || (!t && s)) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } catch(e) {}
                })();
                `,
          }}
        />
      </head>
      <body className="min-h-screen">
        {/* ThemeProvider toggles the .dark class and persists the choice */}
        <ThemeProvider>
          <AuthSessionProvider>
            <DemoModeBanner />
            <Navbar />
            <div className="flex">
              <StudioSidebar />
              <div className="flex-1">
                <main className="py-8 px-6 max-w-6xl mx-auto">{children}</main>
                <footer className="py-10 px-6 text-center text-sm text-brand-muted max-w-6xl mx-auto space-y-2">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-xs md:text-sm">
                    <span className="text-brand-muted">Support: <a className="underline hover:text-white" href="mailto:support@use-growthpilot.ai">support@use-growthpilot.ai</a></span>
                    <span className="text-brand-muted">Billing: <a className="underline hover:text-white" href="mailto:billing@use-growthpilot.ai">billing@use-growthpilot.ai</a></span>
                    <span className="text-brand-muted">Security: <a className="underline hover:text-white" href="mailto:security@use-growthpilot.ai">security@use-growthpilot.ai</a></span>
                  </div>
                  <div>© {new Date().getFullYear()} GrowthPilot</div>
                </footer>
              </div>
            </div>
            <SupportChat />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
