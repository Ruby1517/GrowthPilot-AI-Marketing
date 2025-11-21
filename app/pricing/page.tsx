import Link from 'next/link';
import { PLAN_LIMITS } from '@/lib/limits';

export const metadata = { title: 'Pricing — GrowthPilot' };

function PlanCard({ name }: { name: keyof typeof PLAN_LIMITS }) {
  const p = PLAN_LIMITS[name];
  return (
    <div className="card p-6 border-white/20">
      <h3 className="text-xl font-semibold">{name}</h3>
      <ul className="mt-3 text-sm space-y-1">
        {/* <li>ViralPilot minutes: <b>{p.viralpilot_minutes}</b></li>
        <li>ClipPilot minutes: <b>{p.clippilot_minutes}</b></li> */}
        <li>BlogPilot words: <b>{p.blogpilot_words.toLocaleString()}</b></li>
        <li>MailPilot emails: <b>{p.mailpilot_emails.toLocaleString()}</b></li>
        <li>AdPilot variants: <b>{p.adpilot_variants}</b></li>
        <li>LeadPilot conversations: <b>{p.leadpilot_convos}</b></li>
        <li>BrandPilot assets: <b>{p.brandpilot_assets}</b></li>
      </ul>
      <Link href="/billing" className="btn-gold mt-4 inline-block">Choose {name}</Link>
    </div>
  );
}

export default function PricingPage() {
  return (
    <section className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="card p-8">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="text-brand-muted mt-2 text-sm">Starter for getting going, Pro for teams, Business for scale. Overage is available on all plans.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard name="Starter" />
        <PlanCard name="Pro" />
        <PlanCard name="Business" />
      </div>
    </section>
  );
}

