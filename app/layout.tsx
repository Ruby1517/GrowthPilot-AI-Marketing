// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import Navbar from '@/components/Navbar';
import StudioSidebar from '@/components/StudioSidebar';
import AuthSessionProvider from '@/components/AuthSessionProvider';

export const metadata = {
  title: 'GrowthPilot — AI Suite',
  description: 'All-in-one AI marketing suite',
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
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
