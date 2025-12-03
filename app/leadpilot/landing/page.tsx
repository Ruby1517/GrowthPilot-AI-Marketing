export const revalidate = 60;

import Link from "next/link";

const highlights = [
  { title: "On-brand chat", desc: "Generate lead capture chat flows that match your brand voice and product positioning." },
  { title: "Multi-channel", desc: "Use the same flows on site, SMS, or email follow-ups to convert visitors faster." },
  { title: "Qualify & route", desc: "Capture intent, qualify with smart questions, and route to sales or booked meetings." },
  { title: "Fast handoff", desc: "Summaries, tagged answers, and follow-up templates for sales handoff." },
];

const steps = [
  { title: "1) Define the offer", items: ["Describe your product/offer and target audience.", "Pick tone, brand voice, and CTA (book, demo, download)."] },
  { title: "2) Generate flows", items: ["Chat prompts, branches, objection handling, and follow-up copy.", "Optional email/SMS follow-ups from the same brief."] },
  { title: "3) Launch & iterate", items: ["Export flows for your chat widget or CRM.", "Test variants and keep the best-performing prompts."] },
];

export default function LeadPilotLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fff5e8] to-[#fffaf3] text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-brand-muted">
            LeadPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Convert visitors with on-brand lead capture flows
              </h1>
              <p className="text-slate-700 dark:text-brand-muted text-sm md:text-base">
                Generate chat flows, qualifying questions, and follow-up messages that match your brand and offers. Keep objection handling and CTAs consistent across channels.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/leadpilot" className="btn-gold">Try LeadPilot</Link>
                <Link href="/leadpilot" className="btn-ghost border border-slate-200 text-slate-900 hover:bg-slate-100 bg-white/80 shadow-sm dark:border-white/10 dark:text-white">View your flows</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5">
              <div className="text-sm text-slate-700 dark:text-brand-muted">What you get</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Chat copy with branches and objections</li>
                <li>• Qualifying questions and lead tags</li>
                <li>• CTA variants (book, demo, download, contact)</li>
                <li>• Follow-up email/SMS snippets</li>
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
            <h2 className="text-2xl font-semibold">From brief to live chat in three steps</h2>
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
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to convert?</div>
          <h3 className="text-2xl font-semibold">Launch on-brand lead flows in minutes</h3>
          <p className="text-slate-700 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            LeadPilot keeps your chat and follow-ups on-message, with CTA and objection handling ready to go.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/leadpilot" className="btn-gold">Create flows</Link>
            <Link href="/leadpilot" className="btn-ghost border border-slate-200 text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white">View your flows</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
