export const revalidate = 60;

import Link from "next/link";

const highlights = [
  { title: "Lifecycle ready", desc: "Generate nurture, promos, reactivation, onboarding, and announcement sequences in your brand voice." },
  { title: "Personalized", desc: "Tailor subject lines, preview text, and body copy to segments and intent." },
  { title: "Design prompts", desc: "Provide hero/copy blocks, CTA variants, and image prompts so your designer (or generator) can move fast." },
  { title: "A/B friendly", desc: "Multiple subject/body/CTA variants per send, ready for tests." },
];

const steps = [
  { title: "1) Define the send", items: ["Pick campaign type (promo, lifecycle, launch).", "Add audience, offer, and tone."] },
  { title: "2) Generate variants", items: ["Subjects, preview text, headers, CTAs, and body copy.", "Optional image prompts for hero/inline visuals."] },
  { title: "3) Ship & test", items: ["Export variants, slot into your ESP, and test.", "Reuse snippets for social follow-ups."] },
];

export default function MailPilotLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fff5e8] to-[#fffaf3] text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-brand-muted">
            MailPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Ship email campaigns faster, with on-brand variants
              </h1>
              <p className="text-slate-700 dark:text-brand-muted text-sm md:text-base">
                Generate lifecycle and promo emails with subject lines, preview text, body copy, CTAs, and visual prompts—ready to test in your ESP.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/mailpilot" className="btn-gold">Try MailPilot</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5">
              <div className="text-sm text-slate-700 dark:text-brand-muted">What you get</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Subject lines + preview text variants</li>
                <li>• Headers, body copy, CTAs, and footers</li>
                <li>• Image prompts for hero/inline visuals</li>
                <li>• Tone and segment controls</li>
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
            <h2 className="text-2xl font-semibold">From brief to send in three steps</h2>
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
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to send?</div>
          <h3 className="text-2xl font-semibold">Draft campaign-ready emails in minutes</h3>
          <p className="text-slate-700 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            MailPilot keeps your emails on-brand and test-ready with multiple variants and visual prompts.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/mailpilot" className="btn-gold">Start writing</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
