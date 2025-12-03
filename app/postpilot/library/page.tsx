export const dynamic = "force-dynamic";

import Link from "next/link";

export default function PostPilotLibraryPage() {
  return (
    <section className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">PostPilot Library</h1>
        <p className="text-brand-muted text-sm">Your generated social content will appear here.</p>
        <div className="pt-2 flex gap-3">
          <Link className="btn-gold text-sm" href="/postpilot">Create new content</Link>
          <Link className="btn-ghost text-sm" href="/postpilot/landing">Back to landing</Link>
        </div>
      </div>

      <div className="card p-6 text-sm text-brand-muted">
        No saved posts yet. Generate content in PostPilot to see it here.
      </div>
    </section>
  );
}
