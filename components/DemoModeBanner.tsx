'use client';

import { useEffect, useState } from 'react';

export default function DemoModeBanner() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setDemo(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  }, []);

  if (!demo) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-2 rounded-xl border border-white/10 bg-black/70 text-white text-sm py-2 px-3 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">🎬</span>
            <div>
              <div className="font-semibold">Demo mode</div>
              <div className="text-xs text-white/80">Placeholder data; real billing and personal info hidden for recording.</div>
            </div>
          </div>
          <span className="text-xs text-white/60">Disable by unsetting NEXT_PUBLIC_DEMO_MODE.</span>
        </div>
      </div>
    </div>
  );
}
