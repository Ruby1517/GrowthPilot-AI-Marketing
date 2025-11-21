'use client';

import Link from 'next/link';

const FALLBACK_WAITLIST_EMAIL = 'hello@growthpilot.ai';

type Props = {
  moduleName: string;
  tagline: string;
  description: string;
  highlights?: string[];
  etaLabel?: string;
  waitlistEmail?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export default function ModuleComingSoon({
  moduleName,
  tagline,
  description,
  highlights = [],
  etaLabel = 'On deck',
  waitlistEmail = process.env.NEXT_PUBLIC_WAITLIST_EMAIL || FALLBACK_WAITLIST_EMAIL,
  ctaHref = '/dashboard',
  ctaLabel = 'Explore live modules',
}: Props) {
  const waitlistHref = `mailto:${waitlistEmail}?subject=${encodeURIComponent(`${moduleName} waitlist`)}`;

  return (
    <section className="min-h-[60vh] flex flex-col justify-center gap-6">
      <div className="card p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
          <div className="absolute -left-10 top-4 h-56 w-56 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))] blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-60 w-60 rounded-full bg-sky-500 blur-[150px]" />
        </div>
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-brand-muted">
            <span className="badge">Coming Soon</span>
            <span>{etaLabel}</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              {moduleName} <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{tagline}</span>
            </h1>
            <p className="mt-3 text-base text-brand-muted max-w-2xl">
              {description}
            </p>
          </div>

          {!!highlights.length && (
            <ul className="grid gap-3 md:grid-cols-2 mt-4">
              {highlights.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-2xl border border-white/10 dark:border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <a
              href={waitlistHref}
              className="btn-gold"
              target="_blank"
              rel="noreferrer"
            >
              Join the waitlist
            </a>
            <Link href={ctaHref} className="btn-ghost">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <div className="text-sm text-brand-muted">Ready today</div>
        <p className="text-lg md:text-xl font-medium mt-1">
          PostPilot, BlogPilot, AdPilot, LeadPilot, MailPilot, and BrandPilot are live and production ready.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-brand-muted">
          <Link href="/postpilot" className="btn-ghost text-xs">PostPilot</Link>
          <Link href="/blogpilot" className="btn-ghost text-xs">BlogPilot</Link>
          <Link href="/adpilot" className="btn-ghost text-xs">AdPilot</Link>
          <Link href="/leadpilot" className="btn-ghost text-xs">LeadPilot</Link>
          <Link href="/mailpilot" className="btn-ghost text-xs">MailPilot</Link>
          <Link href="/brandpilot" className="btn-ghost text-xs">BrandPilot</Link>
        </div>
      </div>
    </section>
  );
}
