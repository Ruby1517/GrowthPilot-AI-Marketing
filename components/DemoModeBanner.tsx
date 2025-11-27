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
        <div className="mt-2 rounded-xl border border-white/10 bg-black/70 text-white text-sm py-2 px-3 flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">🎬</span>
            <span>Demo mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
