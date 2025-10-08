import Link from 'next/link'

export default function Home() {
  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">AI Marketing Suite</span>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Create posts, blogs, ads, emails & clips <span className="text-[color:var(--gold,theme(colors.brand.gold))]">10× faster</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-brand-muted">
          A modular monolith with shared auth, billing, templates, analytics and
          queues—so each module is just features.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="btn-gold">Open Dashboard</Link>
          <Link href="/billing" className="btn-ghost">Choose a Plan</Link>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {[
          { t:'PostPilot', d:'AI Social Content Generator' },
          { t:'ClipPilot', d:'AI Video/Shorts Creater' },
          { t:'BlogPilot', d:'AI SEO Writer' },
          { t:'AdPilot', d:'AI Ads Optimizer' },
          { t:'LeadPilot', d:'AI Chatbot for Leads' },
          { t:'MailPilot', d:'AI Email Writer' },
          { t:'DesignPilot', d:'AI Design/Branding Assistant'},         
        ].map((x,i)=> (
          <div key={i} className="card p-5">
            <div className="text-sm text-brand-muted">{x.d}</div>
            <div className="mt-1 text-lg font-medium">{x.t}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
