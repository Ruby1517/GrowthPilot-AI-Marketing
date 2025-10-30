'use client';
import { useEffect, useRef, useState } from 'react';

type Lead = {
  _id: string; createdAt: string; site?: string; playbook?: string;
  name?: string; email?: string; company?: string; message?: string; confidence?: number;
};

export default function LeadPilotPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [embedPb, setEmbedPb] = useState('homepage');

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const script = `<script src="${origin}/api/leadpilot/widget.js" data-playbook="${embedPb}"></script>`;

  async function load() {
    const r = await fetch('/api/leadpilot/leads', { cache: 'no-store' });
    if (!r.ok) return setLeads([]);
    const j = await r.json();
    setLeads(j.items || []);
  }
  useEffect(()=>{ load(); },[]);

  // floating preview state
  const [widgetOpen, setWidgetOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // close when clicking outside the panel
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!widgetOpen) return;
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) {
        setWidgetOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [widgetOpen]);

  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">LeadPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          AI chatbot for <span className="text-[color:var(--gold,theme(colors.brand.gold))]">lead capture</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Copy-paste the snippet on your site, choose a playbook, and leads will appear here.
        </p>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {/* Embed panel */}
          <div className="card p-4">
            <div className="text-sm text-brand-muted mb-1">Choose playbook</div>
            <select
              className="w-full rounded-md border p-2.5"
              value={embedPb}
              onChange={e=>setEmbedPb(e.target.value)}
            >
              <option value="homepage">Homepage Lead Qualifier</option>
              <option value="pricing">Pricing Helper</option>
              <option value="demo">Book a Demo</option>
            </select>

            <div className="mt-3 text-sm text-brand-muted">Embed code</div>
            <pre className="mt-1 p-3 rounded-md border text-xs overflow-auto">{script}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(script)}>Copy</button>
              <a className="btn-ghost" href={`/leadpilot/embed?pb=${embedPb}&site=localhost`} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
              <button
                className="btn-gold"
                onClick={()=>setWidgetOpen(v=>!v)}
                aria-pressed={widgetOpen}
                aria-controls="leadpilot-preview"
              >
                {widgetOpen ? 'Hide Preview' : 'Preview on page'}
              </button>
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Preview renders the same floating widget at the bottom-right of this page.
            </p>
          </div>

          {/* Leads panel */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Leads</div>
              <div className="flex gap-2">
                <a className="btn-ghost" href="/api/leadpilot/leads?format=csv">Export CSV</a>
                <button className="btn-ghost" onClick={load}>Refresh</button>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-[color:var(--card-stroke,rgba(255,255,255,0.08))]">
              {leads.map(l=>(
                <li key={l._id} className="py-3 text-sm">
                  <div className="flex justify-between">
                    <div className="font-medium">
                      {l.name || '(unknown)'} <span className="text-brand-muted">• {l.email || '-'}</span>
                    </div>
                    <div className="text-brand-muted">{new Date(l.createdAt).toLocaleString()}</div>
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

      {/* Launcher bubble (bottom-right) */}
      <button
        type="button"
        onClick={()=>setWidgetOpen(v=>!v)}
        className="fixed bottom-5 right-5 z-[2147483647] rounded-full px-4 py-3 shadow-glow
                  bg-[linear-gradient(135deg,#D4AF37,#E7D292)] text-black font-medium"
        title={widgetOpen ? "Close chat preview" : "Open chat preview"}
        aria-label={widgetOpen ? "Close chat preview" : "Open chat preview"}
      >
        {widgetOpen ? '×' : 'Chat'}
      </button>

      {/* Floating iframe panel + invisible backdrop (outside click closes) */}
      {widgetOpen && (
        <>
          <div className="fixed inset-0 z-[2147483645]" aria-hidden="true" />
          <div
            ref={panelRef}
            id="leadpilot-preview"
            className="fixed bottom-[70px] right-5 z-[2147483646] w-[360px] h-[560px] rounded-xl overflow-hidden"
            style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
          >
            <iframe
              title="LeadPilot Preview"
              src={`/leadpilot/embed?pb=${encodeURIComponent(embedPb)}&site=localhost`}
              className="w-full h-full border-0"
            />
          </div>
        </>
      )}
    </section>
  );
}
