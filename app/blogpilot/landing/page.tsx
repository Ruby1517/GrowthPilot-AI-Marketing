export const revalidate = 60;

import Link from "next/link";

const highlights = [
  { title: "SEO + Brand aligned", desc: "Draft long-form blogs that match your voice, keywords, and brand guardrails." },
  { title: "Research handled", desc: "Scans your brief or URL, extracts key points, and builds outlines with sources." },
  { title: "Multi-length outputs", desc: "Generate full posts, TL;DRs, and social snippets from the same brief." },
  { title: "Images + CTAs", desc: "Suggests headings, CTA blocks, and image prompts to speed up publishing." },
];

const steps = [
  { title: "1) Set the brief", items: ["Paste a URL or add target keywords and audience.", "Pick tone, brand voice, and desired length."] },
  { title: "2) Generate & refine", items: ["Review outline, tweak sections, and insert brand CTAs.", "Auto-generate images and metadata."] },
  { title: "3) Publish-ready", items: ["Export markdown/HTML with headings, links, and alt text.", "Grab social snippets to promote instantly."] },
];

export default function BlogPilotLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fff5e8] to-[#fffaf3] text-slate-900 dark:bg-gradient-to-b dark:from-[#0b1224] dark:via-[#0d0f1a] dark:to-[#05060a] dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-slate-200 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-brand-muted">
            BlogPilot
          </span>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Publish SEO-friendly blogs in your brand voice—fast
              </h1>
              <p className="text-slate-700 dark:text-brand-muted text-sm md:text-base">
                Turn briefs or URLs into publish-ready blog posts with outlines, citations, metadata, and CTA blocks.
                Spin out social snippets and summaries from the same draft.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/blogpilot" className="btn-gold">Try BlogPilot</Link>
                <Link href="/blogpilot" className="btn-ghost border border-slate-200 text-slate-900 bg-transparent hover:bg-slate-100 dark:border-white/10 dark:text-white">View your drafts</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 space-y-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5">
              <div className="text-sm text-slate-700 dark:text-brand-muted">What’s included</div>
              <ul className="text-sm space-y-2 text-slate-800 dark:text-white/90">
                <li>• Outline + draft with headings, CTAs, and metadata</li>
                <li>• Keyword, audience, and tone controls</li>
                <li>• Image prompts for headers and inline visuals</li>
                <li>• One-click summaries and social promos</li>
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
            <h2 className="text-2xl font-semibold">From brief to publish in three steps</h2>
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
          <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-brand-muted">Ready to publish?</div>
          <h3 className="text-2xl font-semibold">Draft a full post in minutes</h3>
          <p className="text-slate-700 dark:text-brand-muted text-sm max-w-2xl mx-auto">
            BlogPilot keeps your posts on-brand, SEO-friendly, and promotion-ready with summaries and social snippets.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/blogpilot" className="btn-gold">Start writing</Link>
            <Link href="/blogpilot" className="btn-ghost border border-slate-200 text-slate-900 bg-transparent hover:bg-slate-100 dark:border-white/10 dark:text-white">View your drafts</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
