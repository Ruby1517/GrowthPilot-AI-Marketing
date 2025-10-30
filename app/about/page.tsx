export const metadata = {
  title: 'About — GrowthPilot',
  description: 'Learn what GrowthPilot is, what modules it includes, and how billing and limits work.',
};

export default function AboutPage() {
  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h1 className="text-3xl font-semibold">About GrowthPilot</h1>
        <p className="text-brand-muted mt-2 max-w-3xl">
          GrowthPilot is an all‑in‑one AI marketing suite that helps you create social posts, blogs, ads,
          emails, brand assets and videos faster. It brings everything together: shared auth, billing,
          templates, analytics and queues — so you can focus on results.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-medium">Modules</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          <li><b>PostPilot</b> — AI Social Content</li>
          <li><b>BlogPilot</b> — SEO Blog Writer</li>
          <li><b>AdPilot</b> — Ads Optimizer</li>
          <li><b>LeadPilot</b> — Lead Gen Chatbot</li>
          <li><b>MailPilot</b> — AI Email Writer</li>
          <li><b>BrandPilot</b> — Brand & Design Kit</li>
          <li><b>ViralPilot</b> — YouTube Content Creation</li>
          <li><b>ClipPilot</b> — Video/Shorts Creator</li>
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-medium">Plans & Limits</h2>
        <p className="text-brand-muted mt-2 max-w-3xl">
          GrowthPilot supports Starter, Pro and Business plans. Plans unlock access to modules and include fair usage
          limits; optional overage lets you keep working and pay for additional usage. You can upgrade or manage
          billing any time from the Plans & Pricing page.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-medium">How It Works</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-brand-muted max-w-3xl">
          <li>Sign in to create a personal or team org.</li>
          <li>Pick a module and provide a short brief.</li>
          <li>Generate content and export or schedule it.</li>
          <li>Track usage and performance in analytics.</li>
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-medium">Questions?</h2>
        <p className="text-brand-muted mt-2">We’re happy to help — visit Plans & Pricing or sign in to get started.</p>
        <div className="mt-3 flex gap-3">
          <a href="/billing" className="btn-gold">View Plans</a>
          <a href="/api/auth/signin" className="btn-ghost">Sign In</a>
        </div>
      </div>
    </section>
  );
}

