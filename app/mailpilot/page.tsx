'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type EmailItem = {
  step: number;
  delayDays: number;
  subjectA: string;
  subjectB: string;
  preheader: string;
  html: string;
  text?: string;
};

type Generated = {
  mergeVars: string[];
  emails: EmailItem[];
  spam: { score: number; hits: string[] };
};

type Campaign = {
  _id: string;
  type: 'cold'|'warm'|'newsletter'|'nurture';
  title?: string;
  offer?: string;
  audience?: string;
  tone?: string;
  sender?: { sender_name?: string; sender_company?: string; sender_email?: string };
  emails: EmailItem[];
  spam?: { score: number; hits: string[] };
  createdAt: string;
};

function parseCSV(csv: string) {
  // super-light CSV parser: email,first_name,last_name,company
  const rows = csv.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  const out: any[] = [];
  for (const r of rows) {
    const cols = r.split(',').map(x=>x?.trim());
    const [email, first_name='', last_name='', company=''] = cols;
    if (email) out.push({ email, first_name, last_name, company });
  }
  return out;
}

export default function MailPilotPage() {
  // form
  const [type, setType] = useState<'cold'|'warm'|'newsletter'|'nurture'>('newsletter');
  const [steps, setSteps] = useState(3);
  const [title, setTitle] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('friendly, clear, professional');

  const [sender_name, setSenderName] = useState('GrowthPilot Team');
  const [sender_company, setSenderCompany] = useState('GrowthPilot');
  const [sender_email, setSenderEmail] = useState('noreply@example.com');

  // recipients
  const [csvText, setCsvText] = useState('');
  const [recipients, setRecipients] = useState<any[]>([]);
  const parsedCount = recipients.length;

  // generation state
  const [gen, setGen] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);

  // UI details for previewing gen
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [activeVariant, setActiveVariant] = useState<'A'|'B'>('A');

  // history
  const [history, setHistory] = useState<Campaign[]>([]);
  const testToRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ loadHistory(); },[]);
  async function loadHistory() {
    const r = await fetch('/api/mailpilot/list', { cache: 'no-store' });
    if (!r.ok) { setHistory([]); return; }
    const j = await r.json();
    setHistory(j.items || []);
  }

  function handleCSVImport() {
    setRecipients(parseCSV(csvText));
  }

  async function generate() {
    setLoading(true);
    setGen(null);
    setActiveStepIdx(0);
    setActiveVariant('A');
    try {
      const r = await fetch('/api/mailpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          type, title, offer, audience, tone,
          sender: { sender_name, sender_company, sender_email },
          steps: type === 'nurture' ? steps : 1,
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generate failed');
      setGen(j.result);
    } catch (e:any) {
      alert(e.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!gen) return;
    const r = await fetch('/api/mailpilot/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        type, title, offer, audience, tone,
        sender: { sender_name, sender_company, sender_email },
        mergeVars: gen.mergeVars,
        emails: gen.emails,
        recipients,
        spam: gen.spam,
      })
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || 'Save failed');
    await loadHistory();
    alert('Saved to history!');
  }

  async function exportFile(id: string, format: 'html'|'eml') {
    const res = await fetch(`/api/mailpilot/export?id=${id}&format=${format}`, { method: 'POST' });
    if (!res.ok) return alert('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mailpilot-${id}.${format}`;
    a.click();
  }

  async function sendTest(id: string) {
    const to = testToRef.current?.value?.trim();
    if (!to) return alert('Enter a test email address');
    const r = await fetch('/api/mailpilot/send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, to, variant: 'A' })
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || 'Send failed');
    alert('Test email sent!');
  }

  const activeEmail = useMemo(() => {
    if (!gen?.emails?.length) return null;
    return gen.emails[Math.min(activeStepIdx, gen.emails.length-1)];
  }, [gen, activeStepIdx]);

  return (
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">MailPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          AI email campaigns <span className="text-[color:var(--gold,theme(colors.brand.gold))]">ready to send</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Outreach, newsletters, or nurture sequences with subject A/B, preheaders, spam check, exports, and test send.
        </p>

        {/* Builder */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {/* Left: Setup */}
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-brand-muted mb-1">Type</div>
                <select
                  className="w-full rounded-md border p-2.5"
                  value={type}
                  onChange={e=>setType(e.target.value as any)}
                >
                  <option value="cold">Cold outreach</option>
                  <option value="warm">Warm outreach</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="nurture">Nurture sequence</option>
                </select>
              </div>

              {type === 'nurture' && (
                <div>
                  <div className="text-sm text-brand-muted mb-1">Steps</div>
                  <input
                    className="w-full rounded-md border p-2.5"
                    type="number" min={2} max={6}
                    value={steps}
                    onChange={e=>setSteps(Math.max(2, Math.min(6, Number(e.target.value||2))))}
                  />
                </div>
              )}

              <div className="col-span-2">
                <div className="text-sm text-brand-muted mb-1">Title (internal)</div>
                <input
                  className="w-full rounded-md border p-2.5"
                  placeholder="e.g., July newsletter, Cold to SaaS founders"
                  value={title}
                  onChange={e=>setTitle(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <div className="text-sm text-brand-muted mb-1">Offer / Message</div>
                <textarea
                  className="w-full rounded-md border p-2.5"
                  rows={3}
                  placeholder="Describe your offer or paste a landing page URL..."
                  value={offer}
                  onChange={e=>setOffer(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <div className="text-sm text-brand-muted mb-1">Audience</div>
                <input
                  className="w-full rounded-md border p-2.5"
                  placeholder="ICP, persona, segment..."
                  value={audience}
                  onChange={e=>setAudience(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <div className="text-sm text-brand-muted mb-1">Tone</div>
                <input
                  className="w-full rounded-md border p-2.5"
                  value={tone}
                  onChange={e=>setTone(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-brand-muted mb-1">Sender</div>
              <div className="grid grid-cols-3 gap-3">
                <input className="rounded-md border p-2.5" placeholder="Name" value={sender_name} onChange={e=>setSenderName(e.target.value)} />
                <input className="rounded-md border p-2.5" placeholder="Company" value={sender_company} onChange={e=>setSenderCompany(e.target.value)} />
                <input className="rounded-md border p-2.5" placeholder="Email" value={sender_email} onChange={e=>setSenderEmail(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="btn-gold" onClick={generate} disabled={loading}>
                {loading ? 'Generating…' : 'Generate'}
              </button>
              {gen && <button className="btn-ghost" onClick={()=>setGen(null)}>Clear</button>}
            </div>
          </div>

          {/* Right: Recipients */}
          <div className="card p-4">
            <div className="text-sm text-brand-muted">Import recipients (CSV: <code className="opacity-80">email,first_name,last_name,company</code>)</div>
            <textarea
              className="mt-2 w-full rounded-md border p-2.5 h-[140px]"
              placeholder="jane@acme.com,Jane,,Acme Inc"
              value={csvText}
              onChange={e=>setCsvText(e.target.value)}
            />
            <div className="mt-2 flex items-center gap-2">
              <button className="btn-ghost" onClick={handleCSVImport}>Parse CSV</button>
              <div className="text-sm text-brand-muted">Parsed: {parsedCount}</div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-brand-muted mb-1">Send test (to)</div>
              <input ref={testToRef} className="w-full rounded-md border p-2.5" placeholder="your@email.com" />
              <p className="mt-2 text-xs text-brand-muted">
                Use SMTP or SendGrid env keys to enable test sending.
              </p>
            </div>
          </div>
        </div>

        {/* Generated Output */}
        {gen && (
          <div className="mt-6 card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm text-brand-muted">Spam score:</div>
                <div className={`text-sm ${gen.spam.score >= 40 ? 'text-red-300' : gen.spam.score >= 20 ? 'text-yellow-300' : 'text-green-300'}`}>
                  {gen.spam.score}/100
                </div>
                {gen.spam.hits.length > 0 && (
                  <div className="text-xs text-brand-muted">hits: {gen.spam.hits.join(', ')}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-gold" onClick={save}>Save</button>
              </div>
            </div>

            {/* Steps tabs (for nurture) */}
            {gen.emails.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {gen.emails.map((e, i) => (
                  <button
                    key={i}
                    className={`px-3 py-1 rounded-md border text-sm ${i===activeStepIdx ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-brand-muted hover:text-white'}`}
                    onClick={()=>setActiveStepIdx(i)}
                  >
                    Step {e.step} {e.delayDays ? `• +${e.delayDays}d` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Variant toggle */}
            <div className="mt-4 flex items-center gap-2">
              <div className="text-sm text-brand-muted">Subject:</div>
              <button
                className={`px-2 py-1 rounded-md border text-xs ${activeVariant==='A' ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-brand-muted hover:text-white'}`}
                onClick={()=>setActiveVariant('A')}
              >
                A
              </button>
              <button
                className={`px-2 py-1 rounded-md border text-xs ${activeVariant==='B' ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-brand-muted hover:text-white'}`}
                onClick={()=>setActiveVariant('B')}
              >
                B
              </button>
            </div>

            {/* Current email preview */}
            {activeEmail && (
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-sm">
                    <div className="text-brand-muted">Subject {activeVariant}:</div>
                    <div className="font-medium break-words">
                      {activeVariant === 'A' ? activeEmail.subjectA : activeEmail.subjectB}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-brand-muted">Preheader:</div>
                    <div className="break-words">{activeEmail.preheader}</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-brand-muted mb-1">HTML preview</div>
                    <div className="rounded-md border overflow-hidden bg-white text-black">
                      {/* Keep it simple: render HTML directly */}
                      <iframe
                        className="w-full h-[360px] bg-white"
                        srcDoc={activeEmail.html}
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <div className="text-sm text-brand-muted">Actions</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {/* Save was above; here we include handy copies */}
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(activeVariant==='A' ? activeEmail.subjectA : activeEmail.subjectB)}>
                      Copy Subject {activeVariant}
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(activeEmail.preheader)}>
                      Copy Preheader
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(activeEmail.html)}>
                      Copy HTML
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(activeEmail.text || '')}>
                      Copy Text
                    </button>
                  </div>

                  <div className="mt-4 text-sm text-brand-muted">Test send (uses SMTP/SendGrid env)</div>
                  <div className="mt-2 flex gap-2">
                    <input ref={testToRef} className="flex-1 rounded-md border p-2.5" placeholder="your@email.com" />
                    {/* Send requires a saved ID. Tell user to use history actions for test after save. */}
                    <button
                      className="btn-gold"
                      onClick={()=>alert('Save campaign first, then use "Send test" from History list below.')}
                    >
                      Send
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-brand-muted">
                    Tip: Save first, then use History actions to export **.html / .eml** or send a **test**.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="mt-6 card p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">History</div>
            <button className="btn-ghost" onClick={loadHistory}>Refresh</button>
          </div>

          {history.length === 0 ? (
            <div className="mt-3 text-sm text-brand-muted">No saved campaigns yet.</div>
          ) : (
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {history.map((h)=> {
                const first = h.emails?.[0];
                const subj = first ? (first.subjectA || first.subjectB || '(no subject)') : '(no subject)';
                return (
                  <div key={h._id} className="card p-4">
                    <div className="text-sm text-brand-muted">{h.type} • {new Date(h.createdAt).toLocaleString()}</div>
                    <div className="mt-1 font-medium break-words">{h.title || subj}</div>
                    {h.spam && (
                      <div className={`mt-1 text-xs ${h.spam.score >= 40 ? 'text-red-300' : h.spam.score >= 20 ? 'text-yellow-300' : 'text-green-300'}`}>
                        Spam: {h.spam.score}/100
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-ghost" onClick={()=>exportFile(h._id, 'html')}>Export HTML</button>
                      <button className="btn-ghost" onClick={()=>exportFile(h._id, 'eml')}>Export .EML</button>
                      <button className="btn-ghost" onClick={()=>sendTest(h._id)}>Send test</button>
                      <a
                        className="btn-ghost"
                        href="#"
                        onClick={(e)=>{ e.preventDefault(); navigator.clipboard.writeText(JSON.stringify(h, null, 2)); }}
                      >
                        Copy JSON
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
