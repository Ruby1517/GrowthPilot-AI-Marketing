export const revalidate = 60;

import Link from "next/link";

const highlights = [
  { title: "Platform-aware", desc: "Auto-tailors captions, hashtags, and tone for Instagram, TikTok, LinkedIn, X, and Facebook." },
  { title: "Brief to batch", desc: "Drop a URL or short brief and get a full week of posts with hooks, CTAs, and alt text." },
  { title: "Visuals included", desc: "Pair every caption with image prompts so your designer—or our generator—has a head start." },
  { title: "Multilingual", desc: "Publish globally with native-sounding copy; keep brand voice consistent across markets." },
];

const steps = [
  { title: "1) Set the brief", items: ["Paste your site or describe the campaign.", "Pick platforms, tone, and cadence."] },
  { title: "2) Generate & tweak", items: ["Review hooks, CTAs, and hashtags.", "Swap tones, adjust length, and localize."] },
  { title: "3) Launch anywhere", items: ["Download CSV/PNG-ready posts.", "Push to your scheduler or hand off to design."] },
];

const socials = ["Instagram", "TikTok", "LinkedIn", "X", "Facebook"];

export default function PostPilotLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fff5e8] to-[#fffaf3] text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-brand-muted">
            PostPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Social content in minutes, tuned to every platform
              </h1>
              <p className="text-slate-700 dark:text-brand-muted text-sm md:text-base">
                Turn briefs or URLs into ready-to-publish posts with hooks, CTAs, hashtags, alt text, and visual prompts.
                Batch a week—or a month—of content with consistent brand voice.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/postpilot" className="btn-gold">Try PostPilot</Link>
                <Link href="/postpilot/library" className="btn-ghost border border-slate-200 text-slate-900 hover:bg-slate-100 bg-white/80 shadow-sm dark:border-white/10 dark:text-white">View your content</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 space-y-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5">
              <div className="text-sm text-slate-700 dark:text-brand-muted">Platforms</div>
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-800 dark:bg-white/10 dark:text-white">{s}</span>
                ))}
              </div>
              <div className="text-sm text-slate-700 dark:text-brand-muted">What you get</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Hooks, captions, hashtags, CTAs</li>
                <li>• Alt text + visual prompts for designers or AI</li>
                <li>• CSV/PNG export for schedulers and decks</li>
                <li>• Tone and length controls per channel</li>
              </ul>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map((h) => (
            <div key={h.title} className="card p-5 border border-slate-200 bg-white/85 space-y-2 text-slate-900 shadow-[0_10px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-white">
              <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">{h.title}</div>
              <div className="text-base text-slate-800 dark:text-white/90">{h.desc}</div>
            </div>
          ))}
        </section>

        <section className="card p-6 border border-slate-200 bg-white/85 space-y-4 text-slate-900 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-white">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-brand-muted">Workflow</div>
            <h2 className="text-2xl font-semibold">From brief to scheduled in three steps</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white dark:border-white/10 dark:bg-white/5">
                <div className="font-semibold">{s.title}</div>
                <ul className="text-sm text-slate-700 dark:text-brand-muted space-y-1">
                  {s.items.map((it) => <li key={it}>• {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 border border-slate-200 bg-white/85 space-y-3 text-slate-900 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-white">
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Why teams switch</div>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-800 dark:text-white/90">
            <div className="space-y-1">
              <div className="font-semibold">Brand-safe</div>
              <p className="text-slate-700 dark:text-brand-muted">Lock voice, banned words, and CTA templates so every post stays on-brand.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold">Campaign-aware</div>
              <p className="text-slate-700 dark:text-brand-muted">Batch content around launches, promos, and product drops—no manual rewrites per channel.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold">Exports that fit</div>
              <p className="text-slate-700 dark:text-brand-muted">CSV for schedulers, PNGs for decks, captions + prompts for your design pipeline.</p>
            </div>
          </div>
        </section>

        <section className="card p-6 border border-slate-200 bg-white text-center space-y-3 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to launch?</div>
          <h3 className="text-2xl font-semibold">Generate a week of posts in minutes</h3>
          <p className="text-slate-700 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            Start with PostPilot and keep your social channels fresh with on-brand content and visuals.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/postpilot" className="btn-gold">Try PostPilot</Link>
            <Link href="/postpilot/library" className="btn-ghost border border-slate-200 text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white">View your content</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
