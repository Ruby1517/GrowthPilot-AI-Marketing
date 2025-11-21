// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import Navbar from '@/components/Navbar';
import StudioSidebar from '@/components/StudioSidebar';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import SupportChat from '@/components/SupportChat';

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
      maxSnippet: -1,
      maxImagePreview: 'large',
      maxVideoPreview: -1,
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
            <Navbar />
            <div className="flex">
              <StudioSidebar />
              <div className="flex-1">
                <main className="py-8 px-6 max-w-6xl mx-auto">{children}</main>
                <footer className="py-10 px-6 text-center text-sm text-brand-muted max-w-6xl mx-auto">
                  © {new Date().getFullYear()} GrowthPilot
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
