import Link from "next/link";

const highlights = [
  { title: "Auto clip plans", body: "Find the best 15–30s hook, add promo badges, CTA, and brand tag automatically." },
  { title: "Voice-over + music", body: "AI voice-over (energetic influencer style) with low-mix background music so narration stays crisp." },
  { title: "Private & secure", body: "Clips render on your account and upload to private S3. Playback via signed URLs only." },
  { title: "One-click export", body: "MP4 ready for Reels, TikTok, YouTube Shorts, plus a signed download link for your team." },
];

const steps = [
  "Upload a long-form video or drop an S3 link.",
  "ClipPilot transcribes, picks the best hook, and drafts promo/CTA/brand tags.",
  "Optionally add AI voice-over and low-volume music under the narration.",
  "Render, store to private S3, and share the signed link with your team.",
];

export default function ClipPilotLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-16">
        {/* Hero */}
        <section className="space-y-6">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-brand-muted">
              <span className="text-xs uppercase tracking-wide text-amber-300">New</span>
              <span className="text-sm text-white">ClipPilot — AI Video/Shorts Creator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Turn any long video into a <span className="text-amber-300">viral short</span> with built-in ads polish.
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl">
              ClipPilot finds the hook, adds promo badges and CTAs, mixes AI voice-over with low background music, and saves everything to your private S3. One click to share a signed link with your team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/clippilot" className="btn-gold">
                Try ClipPilot
              </Link>
              <Link href="/clippilot/library" className="btn-ghost">
                View your clips
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                Private S3 storage
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-300" />
                AI voice-over + music ready
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sky-300" />
                Signed URLs for sharing
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Why teams use ClipPilot</h2>
            <p className="text-slate-300 text-sm">Everything you need to turn long-form into social-ready shorts with ad polish built in.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {highlights.map((h) => (
              <div key={h.title} className="card bg-slate-900/60 border border-white/10 rounded-xl p-5 space-y-2">
                <div className="text-amber-300 text-sm font-semibold">{h.title}</div>
                <div className="text-slate-200 text-sm">{h.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="space-y-3 text-sm text-slate-200">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-full bg-amber-300 text-slate-950 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="card bg-gradient-to-r from-amber-400/15 to-amber-300/10 border border-amber-200/30 rounded-2xl p-8 space-y-3">
          <h3 className="text-2xl font-semibold text-white">Ready to launch your next short?</h3>
          <p className="text-slate-100 text-sm">
            Upload a video, generate the ad-ready plan, add AI voice-over with low music, and share a signed link in minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/clippilot" className="btn-gold">
              Start a new short
            </Link>
            <Link href="/clippilot/library" className="btn-ghost">
              Browse your library
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
