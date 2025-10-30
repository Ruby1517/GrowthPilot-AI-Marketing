"use client";
import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'




function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'post': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M5 4h14a1 1 0 0 1 1 1v3H4V5a1 1 0 0 1 1-1Zm-1 7h16v2H4v-2Zm0 4h10v2H4v-2Z"/></svg>);
    case 'clip': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3l4-2.5V18L14 15.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"/></svg>);
    case 'blog': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12v14a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V5Zm4 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z"/></svg>);
    case 'ad': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M3 5h18v10H3V5Zm2 2v6h14V7H5Zm-2 12h10v2H3v-2Zm14 0h4v2h-4v-2Z"/></svg>);
    case 'lead': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5Z"/></svg>);
    case 'mail': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8H2V8a2 2 0 0 1 2-2Zm0 2v.2l8 4.8l8-4.8V8H4Zm0 8h16v2H4v-2Z"/></svg>);
    case 'brand': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M6 3h12a2 2 0 0 1 2 2v8l-8 6l-8-6V5a2 2 0 0 1 2-2Z"/><path fill="currentColor" d="M12 6.5l.9 1.8l2 .3l-1.45 1.4l.35 2l-1.8-.95L10.2 12l.35-2L9.1 8.6l2-.3L12 6.5Z"/></svg>);
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm12-3c0 0-0.02-2.04-.26-3.02a3.04 3.04 0 0 0-2.14-2.14C18.61 6.5 12 6.5 12 6.5s-6.61 0-7.6.24A3.04 3.04 0 0 0 2.26 8.88C2.02 9.86 2 11.9 2 11.9s.02 2.04.26 3.02a3.04 3.04 0 0 0 2.14 2.14c.99.24 7.6.24 7.6.24s6.61 0 7.6-.24a3.04 3.04 0 0 0 2.14-2.14c.24-.98.26-3.02.26-3.02Z" />
        </svg>
      );
    default: return null;
  }
}

export default function Home() {
  const { data: session } = useSession()
  const [demoMap, setDemoMap] = useState<Record<string,string>>({})


  useEffect(() => {
    // Load demo video URLs after initial paint; never block slides
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        const r = await fetch(`${base}/api/modules/demo`, { cache: 'no-store', signal: ctrl.signal })
        if (!r.ok) return
        const j = await r.json().catch(() => ({ items: [] }))
        const map: Record<string, string> = {}
        for (const it of (Array.isArray(j.items) ? j.items : [])) {
          const url = it.url || (it.key ? `/api/assets/view?key=${encodeURIComponent(it.key)}` : '')
          if (it.module && url) map[it.module] = url
        }
        setDemoMap(map)
      } catch (_) {
        // ignore failures; slides should still render with images
      }
    }, 0)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [])

  const modules = [
    { key:'postpilot',  t:'PostPilot',  d:'AI Social Content Generator', icon:'post',  href:'/postpilot' },
    { key:'clippilot',  t:'ClipPilot',  d:'AI Video/Shorts Creator',     icon:'clip',  href:'/clips' },
    { key:'blogpilot',  t:'BlogPilot',  d:'AI SEO Writer',               icon:'blog',  href:'/blogpilot' },
    { key:'adpilot',    t:'AdPilot',    d:'AI Ads Optimizer',            icon:'ad',    href:'/adpilot' },
    { key:'leadpilot',  t:'LeadPilot',  d:'AI Chatbot for Leads',        icon:'lead',  href:'/leadpilot' },
    { key:'mailpilot',  t:'MailPilot',  d:'AI Email Writer',             icon:'mail',  href:'/mailpilot' },
    { key:'brandpilot', t:'BrandPilot', d:'AI Design/Branding Assistant',icon:'brand', href:'/brandpilot' },
    { key:'viralpilot', t:'ViralPilot', d:'YouTube Content Creation',    icon:'youtube',href:'/viralpilot' },
  ] as const;

  const items = modules as Array<{ key:string; t:string; d:string }>
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 z-0 bg-center bg-cover hidden dark:block" style={{ backgroundImage: "url('/3d-bg.png')" }} />
      <div aria-hidden className="absolute inset-0 z-0 hidden dark:block bg-black/40" />
      <div className="relative z-10">
      <Script id="ld-home" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'GrowthPilot',
          url: (typeof window !== 'undefined' ? window.location.origin : 'https://example.com'),
          potentialAction: {
            '@type': 'SearchAction',
            target: `${typeof window !== 'undefined' ? window.location.origin : 'https://example.com'}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        }) }}
      />
      {!session?.user ? (
        <LandingHero />
      ) : (
        <>
          <div className="card p-8 md:p-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge">AI Marketing Suite</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Create posts, blogs, ads, emails & clips <span className="text-[color:var(--gold,theme(colors.brand.gold))]">10× faster</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-brand-muted">
              A modular monolith with shared auth, billing, templates, analytics and queues—so each module is just features.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/dashboard" className="btn-gold">Open Dashboard</Link>
              <Link href="/billing" className="btn-ghost">Choose a Plan</Link>
            </div>
          </div>

          {/* Slides: moving carousel for module demos (click to open video) */}
          <Slides items={items as any} demoMap={demoMap} />
        </>
      )}
      </div>
    </section>
  )
}

function Slides({ items, demoMap }: { items: Array<{ key:string; t:string; d:string }>, demoMap: Record<string,string> }) {
  const [idx, setIdx] = useState(0)
  const [playerUrl, setPlayerUrl] = useState<string | null>(null)
  const count = items.length
  function next() { setIdx((i) => (i + 1) % count) }
  function prev() { setIdx((i) => (i - 1 + count) % count) }

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 5000)
    return () => clearInterval(id)
  }, [count])

  return (
    <div className="relative mt-8">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {items.map((m, i) => (
            <div key={i} className="min-w-full shrink-0 px-2 md:px-4">
              <div className="rounded-3xl bg-transparent dark:bg-white/5 backdrop-blur-md p-4 md:p-6 shadow-[0_12px_36px_rgba(0,0,0,0.30)]">
                <div className="h-6 w-24 rounded-full bg-black/10 dark:bg-white/10" />
                <div className="mt-4 grid gap-3 md:gap-4 md:grid-cols-2">
                  <button type="button" onClick={() => { const url = demoMap[m.key]; if (url) setPlayerUrl(url); else alert("Demo coming soon"); }} className="h-40 md:h-56 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center group" aria-label={`Open ${m.t} demo`}>
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[color:var(--gold,theme(colors.brand.gold))] group-hover:scale-110 transition" aria-hidden><path fill="currentColor" d="M10 15l5.19-3L10 9v6Z"/></svg>
                  </button>
                  <div className="space-y-3">
                    <div className="h-10 md:h-12 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
                    <div className="h-10 md:h-12 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
                    <div className="h-10 md:h-12 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <button aria-label="Previous" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 btn-ghost px-3 py-2">‹</button>
      <button aria-label="Next" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost px-3 py-2">›</button>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button key={i} aria-label={`Go to slide ${i+1}`} onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[color:var(--gold,theme(colors.brand.gold))]' : 'w-2 bg-white/30'}`} />
        ))}
      </div>
      {playerUrl && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={()=>setPlayerUrl(null)}>
          <div className="relative w-full max-w-4xl" onClick={(e)=>e.stopPropagation()}>
            <video src={playerUrl} className="w-full rounded-xl border border-white/10" controls autoPlay />
            <button className="absolute -top-3 -right-3 bg-black/70 border border-white/10 rounded-full px-3 py-1 text-sm" onClick={()=>setPlayerUrl(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function LandingHero() {
  const chips = [
    { icon: 'post', label: 'AI Social Content' },
    { icon: 'blog', label: 'SEO Blog Writer' },
    { icon: 'ad', label: 'Ads Optimizer' },
    { icon: 'lead', label: 'Lead Gen Chatbot' },
    { icon: 'mail', label: 'Email Writer' },
    { icon: 'brand', label: 'Brand & Design Kit' },
    { icon: 'youtube', label: 'YouTube Creation' },
  ] as const
  return (
    <div className="relative">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Supercharge Your <span className="text-[color:var(--gold,theme(colors.brand.gold))]">Marketing</span> with AI
        </h1>
        <p className="mt-3 md:mt-4 text-base md:text-lg text-brand-muted">
          All‑in‑One AI Marketing Automation Platform
        </p>
      </div>

      {/* Center app window card */}
      <div className="mt-8 md:mt-12 mx-auto max-w-5xl">
        <div className="rounded-3xl bg-transparent dark:bg-white/5 backdrop-blur-md p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="h-8 w-28 rounded-full bg-white/10" />
          <div className="mt-5 grid gap-4 md:gap-6 md:grid-cols-2">
            <div className="h-48 md:h-64 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[color:var(--gold,theme(colors.brand.gold))]" aria-hidden><path fill="currentColor" d="M10 15l5.19-3L10 9v6Z"/></svg>
            </div>
            <div className="space-y-3">
              <div className="h-12 md:h-14 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
              <div className="h-12 md:h-14 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
              <div className="h-12 md:h-14 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Surrounding feature chips */}
      <div className="mt-6 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        {chips.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-transparent border border-transparent dark:border-white/10 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <Icon name={c.icon} className="w-4 h-4 text-[color:var(--gold,theme(colors.brand.gold))]" />
            <span className="text-sm">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 md:mt-10 flex items-center justify-center gap-3">
        <a href="/api/auth/signin" className="btn-gold">Get Started</a>
        <a href="/billing" className="btn-ghost">View Plans</a>
      </div>
    </div>
  )
}




