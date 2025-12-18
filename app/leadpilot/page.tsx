'use client';
import { useEffect, useState } from 'react';

type Lead = {
  _id: string; createdAt: string; site?: string; playbook?: string;
  name?: string; email?: string; company?: string; message?: string; confidence?: number;
};

export default function LeadPilotPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [embedPb, setEmbedPb] = useState('homepage');
  const [targetSite, setTargetSite] = useState('');

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const script = `<script src="${origin}/api/leadpilot/widget.js" data-playbook="${embedPb}"></script>`;

  async function load() {
    const r = await fetch('/api/leadpilot/leads', { cache: 'no-store' });
    if (!r.ok) return setLeads([]);
    const j = await r.json();
    setLeads(j.items || []);
  }
  useEffect(()=>{ load(); },[]);

  return (
    <section className="relative overflow-hidden px-4 md:px-6 pt-6">
      <div className="card p-5 md:p-10 w-full max-w-5xl mx-auto">
        <span className="badge mb-4">LeadPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          AI concierge for <span className="text-[color:var(--gold,theme(colors.brand.gold))]">lead capture</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Engage visitors, qualify their intent, and collect contact details in minutes. Drop the snippet on your site, pick a playbook, and watch leads route into this dashboard with transcripts you can export or forward.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* Embed panel */}
          <div className="card p-4 space-y-3">
            <div className="text-sm text-brand-muted mb-1">Choose playbook (tone + intent)</div>
            <select
              className="w-full rounded-md border p-2.5"
              value={embedPb}
              onChange={e=>setEmbedPb(e.target.value)}
            >
              <option value="homepage">Homepage Lead Qualifier</option>
              <option value="pricing">Pricing Helper</option>
              <option value="demo">Book a Demo</option>
            </select>

            <div className="text-sm text-brand-muted">Embed code</div>
            <pre className="p-3 rounded-md border text-xs overflow-auto break-words whitespace-pre-wrap break-all">{script}</pre>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn-ghost w-full" onClick={()=>navigator.clipboard.writeText(script)}>Copy</button>
              <a className="btn-ghost w-full" href={`/leadpilot/embed?pb=${embedPb}&site=localhost`} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-sm text-brand-muted" htmlFor="target-site">Business URL or name (for testing)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="target-site"
                  value={targetSite}
                  onChange={(e) => setTargetSite(e.target.value)}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="https://example.com or Acme Inc"
                />
                <a
                  className="btn-gold whitespace-nowrap text-center w-full sm:w-auto"
                  href={`/leadpilot/embed?pb=${embedPb}&site=${encodeURIComponent(targetSite || 'localhost')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open with site
                </a>
              </div>
              <p className="text-xs text-brand-muted">
                Paste a business URL or name to open the chatbot in a new tab with that context.
              </p>
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Preview in a new tab, then drop the snippet onto your site to go live.
            </p>
          </div>

          {/* Leads panel */}
          <div className="card p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium">Latest leads</div>
              <div className="grid gap-2 grid-cols-2 sm:flex sm:flex-row">
                <a className="btn-ghost w-full sm:w-auto" href="/api/leadpilot/leads?format=csv">Export CSV</a>
                <button className="btn-ghost w-full sm:w-auto" onClick={load}>Refresh</button>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-[color:var(--card-stroke,rgba(255,255,255,0.08))]">
              {leads.map(l=>(
                <li key={l._id} className="py-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium leading-tight">
                      {l.name || '(unknown)'} <span className="text-brand-muted">• {l.email || '-'}</span>
                    </div>
                    <div className="text-brand-muted text-xs sm:text-sm">{new Date(l.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-brand-muted">Company: {l.company || '-'}</div>
                  <div className="mt-1 text-brand-muted">Playbook: {l.playbook || '-'} • Site: {l.site || '-'}</div>
                </li>
              ))}
              {leads.length===0 && <li className="py-3 text-sm text-brand-muted">No leads yet.</li>}
            </ul>
          </div>
        </div>
      </div>

    </section>
  );
}
