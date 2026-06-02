'use client';

import { useEffect, useState } from 'react';

type Lead = {
  _id: string;
  createdAt: string;
  site?: string;
  playbook?: string;
  name?: string;
  email?: string;
  company?: string;
  confidence?: number;
};

const PLAYBOOKS = [
  { value: 'homepage', label: 'Homepage visitor',  desc: 'Qualify intent, collect contact' },
  { value: 'pricing',  label: 'Pricing page',      desc: 'Answer questions, push to demo' },
  { value: 'demo',     label: 'Demo request',       desc: 'Book a meeting instantly' },
];

export default function LeadPilotPage() {
  const [playbook,    setPlaybook]    = useState('homepage');
  const [targetSite,  setTargetSite]  = useState('');
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [copied,      setCopied]      = useState(false);

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const embedScript = `<script src="${origin}/api/leadpilot/widget.js" data-playbook="${playbook}"></script>`;

  async function loadLeads() {
    const r = await fetch('/api/leadpilot/leads', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    setLeads(j.items || []);
  }

  function copyScript() {
    navigator.clipboard.writeText(embedScript).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => { loadLeads(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">LeadPilot</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Add an AI chatbot to your site in 30 seconds. It qualifies visitors and routes leads straight here.
        </p>
      </div>

      {/* Step 1: Choose playbook */}
      <div className="card p-6 space-y-4">
        <div className="text-xs uppercase tracking-widest text-brand-muted">Step 1 — Choose a playbook</div>
        <div className="grid gap-2">
          {PLAYBOOKS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlaybook(p.value)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                playbook === p.value
                  ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1 ${playbook === p.value ? 'border-[color:var(--gold)] bg-[color:var(--gold)]' : 'border-white/30'}`} />
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-brand-muted">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Embed code */}
      <div className="card p-6 space-y-4">
        <div className="text-xs uppercase tracking-widest text-brand-muted">Step 2 — Add to your site</div>
        <div className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-xs text-white/80 break-all">
          {embedScript}
        </div>
        <div className="flex gap-2">
          <button onClick={copyScript} className={`flex-1 btn-gold text-sm flex items-center justify-center gap-1.5 ${copied ? 'opacity-80' : ''}`}>
            {copied ? (
              <><svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Copied!</>
            ) : (
              'Copy embed code'
            )}
          </button>
          <a
            href={`/leadpilot/embed?pb=${playbook}&site=${encodeURIComponent(targetSite || 'localhost')}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm px-4 flex-shrink-0"
          >
            Preview ↗
          </a>
        </div>
        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Test with your site <span className="opacity-60">(optional)</span></label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
            placeholder="https://yoursite.com or company name"
            value={targetSite}
            onChange={e => setTargetSite(e.target.value)}
          />
        </div>
        <p className="text-xs text-brand-muted">
          Paste the embed code into your site&apos;s <code className="bg-white/10 px-1 rounded">&lt;body&gt;</code> tag. The chatbot appears in the bottom-right corner.
        </p>
      </div>

      {/* Step 3: Leads */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Step 3 — Your leads</div>
          <div className="flex items-center gap-2">
            <a href="/api/leadpilot/leads?format=csv" className="btn-ghost text-xs">Export CSV</a>
            <button onClick={loadLeads} className="btn-ghost text-xs">Refresh</button>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center space-y-2">
            <div className="text-2xl">💬</div>
            <div className="text-sm font-medium">No leads yet</div>
            <div className="text-xs text-brand-muted">Add the embed code to your site and leads will appear here.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {leads.map(l => (
              <div key={l._id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-medium">
                    {l.name || '(no name)'}{l.email && <span className="text-brand-muted font-normal"> · {l.email}</span>}
                  </div>
                  {l.company && <div className="text-xs text-brand-muted">{l.company}</div>}
                  <div className="text-xs text-brand-muted capitalize">{l.playbook || 'homepage'} playbook</div>
                </div>
                <div className="text-xs text-brand-muted flex-shrink-0">
                  {new Date(l.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
