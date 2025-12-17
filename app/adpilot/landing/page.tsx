import Link from "next/link";
import { auth } from "@/lib/auth";

const highlights = [
  { title: "Channel-aware", desc: "Generates search, social, and display variants with platform-ready lengths and hooks." },
  { title: "Offer-first", desc: "Aligns headlines, CTAs, and body copy around your promos, audiences, and positioning." },
  { title: "Creative prompts", desc: "Pairs each ad with image prompts so design (or your generator) can move fast." },
  { title: "Test-ready", desc: "Delivers multiple variants per angle with clear CTAs and intent-aligned messaging." },
];

const steps = [
  { title: "1) Define the offer", items: ["Paste a URL or describe the product/promo.", "Pick audience, tone, and channels."] },
  { title: "2) Generate variants", items: ["Headlines, bodies, CTAs, and visual prompts.", "Short/long options per channel."] },
  { title: "3) Ship & test", items: ["Export variants for your ad manager.", "Run A/B tests with ready-made angles."] },
];

export default async function AdPilotLanding() {
  const session = await auth();
  const tryHref = session?.user ? "/adpilot" : "/api/auth/signin?callbackUrl=/adpilot";
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fff5e8] to-[#fffaf3] text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-brand-muted">
            AdPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                High-converting ad copy, ready for every channel
              </h1>
              <p className="text-slate-700 dark:text-brand-muted text-sm md:text-base">
                Turn offers into ad variants with headlines, CTAs, and visuals tuned for search, social, and display. Produce multiple angles fast so you can test and scale.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={tryHref} className="btn-gold">Try AdPilot</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5">
              <div className="text-sm text-slate-700 dark:text-brand-muted">What you get</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Headlines, body, CTAs, and angles</li>
                <li>• Short/long variants per channel</li>
                <li>• Visual prompts for creative teams</li>
                <li>• Export-ready for quick A/B tests</li>
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
            <h2 className="text-2xl font-semibold">From offer to launch in three steps</h2>
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

        <section className="card p-6 border border-slate-200 bg-white/85 text-center space-y-3 text-slate-900 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-white">
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to test?</div>
          <h3 className="text-2xl font-semibold">Spin up ad variants in minutes</h3>
          <p className="text-slate-700 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            AdPilot keeps your ads on-message, channel-ready, and testable with visuals and multiple angles.
          </p>
          <div className="flex justify-center gap-3">
            <Link href={tryHref} className="btn-gold">Create ads</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
