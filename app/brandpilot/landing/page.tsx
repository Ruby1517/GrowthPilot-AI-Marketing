import Link from "next/link";
import { auth } from "@/lib/auth";

const highlights = [
  { title: "Instant brand kits", desc: "Generate palettes, font pairings, and voice/tone guardrails from a short brief or URL." },
  { title: "Messaging ready", desc: "Taglines, slogans, pillars, and voice guidelines to keep every channel on-brand." },
  { title: "Asset prompts", desc: "Image prompts for headers, posts, and stories so design (or your generator) can move fast." },
  { title: "Exports included", desc: "Style guide PDF and ZIP of generated assets for easy handoff." },
];

const steps = [
  { title: "1) Set the brief", items: ["Add brand name, vibe, industry, and values.", "Paste a URL if you want us to scan your site."] },
  { title: "2) Generate kit", items: ["Palettes, fonts, voice/tone, messaging pillars.", "Social themes and image prompts for your feeds."] },
  { title: "3) Export & share", items: ["Download the style guide PDF and asset ZIP.", "Revisit to tweak colors, fonts, and voice."] },
];

export default async function BrandPilotLanding() {
  const session = await auth();
  const tryHref = session?.user ? "/brandpilot" : "/api/auth/signin?callbackUrl=/brandpilot";
  return (
    <main className="min-h-screen bg-transparent text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/10 dark:border-white/10 dark:text-white">
            BrandPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Spin up a polished brand kit with messaging in minutes
              </h1>
              <p className="text-slate-600 dark:text-brand-muted text-sm md:text-base">
                Generate palettes, fonts, voice/tone guides, messaging pillars, and image prompts—plus a style guide PDF and asset ZIP for handoff.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={tryHref} className="btn-gold">Try BrandPilot</Link>
                {session?.user && <Link href="/brandpilot/library" className="btn-ghost">View your kits</Link>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm dark:bg-white/5 dark:border-white/10">
              <div className="text-sm text-slate-600 dark:text-brand-muted">What you get</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Palette + font pairings</li>
                <li>• Voice, tone, and messaging pillars</li>
                <li>• Slogans, CTAs, and social themes</li>
                <li>• Image prompts, PDF guide, and asset ZIP</li>
              </ul>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map((h) => (
            <div key={h.title} className="card p-5 border border-slate-200 bg-white space-y-2 shadow-sm dark:bg-white/5 dark:border-white/10">
              <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">{h.title}</div>
              <div className="text-base text-slate-800 dark:text-white/90">{h.desc}</div>
            </div>
          ))}
        </section>

        <section className="card p-6 border border-slate-200 bg-white space-y-4 shadow-sm dark:bg-white/5 dark:border-white/10">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-600 dark:text-brand-muted">Workflow</div>
            <h2 className="text-2xl font-semibold">From brief to style guide in three steps</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white dark:bg-white/5 dark:border-white/10">
                <div className="font-semibold">{s.title}</div>
                <ul className="text-sm text-slate-600 dark:text-brand-muted space-y-1">
                  {s.items.map((it) => <li key={it}>• {it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 border border-slate-200 bg-white text-center space-y-3 shadow-sm dark:bg-white/5 dark:border-white/10">
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to hand off?</div>
          <h3 className="text-2xl font-semibold">Create a brand kit and style guide now</h3>
          <p className="text-slate-600 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            BrandPilot keeps your visuals and messaging consistent with exports your team can use immediately.
          </p>
          <div className="flex justify-center gap-3">
            <Link href={tryHref} className="btn-gold">Create a kit</Link>
            {session?.user && <Link href="/brandpilot/library" className="btn-ghost">View your kits</Link>}
          </div>
        </section>
      </div>
    </main>
  );
}
