'use client';

import { useEffect, useMemo, useState } from 'react';

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

type BrandProfile = {
  _id: string;
  company?: string;
  vibe?: string;
  voice?: string[];
  voiceSelected?: string[];
};

const DEFAULT_TONE = 'friendly, clear, professional';
const DEFAULT_SENDER_NAME = 'GrowthPilot Team';
const DEFAULT_SENDER_COMPANY = 'GrowthPilot';
const DEFAULT_SENDER_EMAIL = 'noreply@example.com';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

function nextHourDate() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setTime(d.getTime() + days * MS_PER_DAY);
  return d;
}

function parseLocalInput(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

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

function htmlToText(html: string) {
  if (!html) return '';
  const withNewlines = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t');
  const stripped = withNewlines.replace(/<[^>]+>/g, '');
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function applyMergeTags(text: string, vars: Record<string, string>) {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key] ?? '';
    return match;
  });
}

function downloadFile(name: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MailPilotPage() {
  // form
  const [type, setType] = useState<'cold'|'warm'|'newsletter'|'nurture'>('newsletter');
  const [steps, setSteps] = useState(3);
  const [title, setTitle] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState(DEFAULT_TONE);

  const [sender_name, setSenderName] = useState(DEFAULT_SENDER_NAME);
  const [sender_company, setSenderCompany] = useState(DEFAULT_SENDER_COMPANY);
  const [sender_email, setSenderEmail] = useState(DEFAULT_SENDER_EMAIL);

  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [brandPrefillApplied, setBrandPrefillApplied] = useState(false);
  const [showKlaviyoModal, setShowKlaviyoModal] = useState(false);
  const [klaviyoListId, setKlaviyoListId] = useState('');
  const [klaviyoSegmentId, setKlaviyoSegmentId] = useState('');
  const [klaviyoSchedule, setKlaviyoSchedule] = useState<Array<{ step: number; sendAt: string; variant: 'A'|'B' }>>([]);
  const [klaviyoBaseStart, setKlaviyoBaseStart] = useState(() => toLocalInputValue(nextHourDate()));
  const [klaviyoSubmitting, setKlaviyoSubmitting] = useState(false);

  // recipients
  const [csvText, setCsvText] = useState('');
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientIdx, setRecipientIdx] = useState(-1);
  const parsedCount = recipients.length;

  // generation state
  const [gen, setGen] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);

  // UI details for previewing gen
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [activeVariant, setActiveVariant] = useState<'A'|'B'>('A');

  // history
  const [history, setHistory] = useState<Campaign[]>([]);

  useEffect(()=>{ loadHistory(); },[]);
  useEffect(()=>{ loadBrandProfile(); },[]);
  useEffect(()=> {
    if (!gen?.emails?.length) {
      setShowKlaviyoModal(false);
      setKlaviyoSchedule([]);
      return;
    }
    const base = nextHourDate();
    setKlaviyoBaseStart(toLocalInputValue(base));
    setKlaviyoSchedule(gen.emails.map((email, idx) => ({
      step: email.step || idx + 1,
      variant: 'A',
      sendAt: toLocalInputValue(addDays(base, email.delayDays || 0)),
    })));
  }, [gen]);
  async function loadHistory() {
    const r = await fetch('/api/mailpilot/list', { cache: 'no-store' });
    if (!r.ok) { setHistory([]); return; }
    const j = await r.json();
    setHistory(j.items || []);
  }

  async function loadBrandProfile() {
    try {
      const r = await fetch('/api/brandpilot/profile', { cache: 'no-store' });
      if (!r.ok) { setBrandProfile(null); return; }
      const j = await r.json();
      setBrandProfile(j.doc || null);
    } catch {
      setBrandProfile(null);
    }
  }

  useEffect(() => {
    if (!brandProfile || brandPrefillApplied) return;
    const voiceList = (brandProfile.voiceSelected?.length ? brandProfile.voiceSelected : brandProfile.voice) || [];
    const voiceSummary = voiceList.join(', ').trim();
    if (voiceSummary && (tone === DEFAULT_TONE || !tone?.trim())) {
      setTone(voiceSummary);
    }
    if (!audience && brandProfile.vibe) {
      setAudience(brandProfile.vibe);
    }
    if (brandProfile.company) {
      if (sender_name === DEFAULT_SENDER_NAME) {
        setSenderName(`${brandProfile.company} Team`);
      }
      if (sender_company === DEFAULT_SENDER_COMPANY) {
        setSenderCompany(brandProfile.company);
      }
    }
    setBrandPrefillApplied(true);
  }, [brandProfile, brandPrefillApplied, tone, audience, sender_name, sender_company]);

  function handleCSVImport() {
    setRecipients(parseCSV(csvText));
    setRecipientIdx(-1);
  }

  function applyBaseToSchedule(baseInput?: string) {
    if (!gen?.emails?.length) return;
    const base = parseLocalInput(baseInput || klaviyoBaseStart);
    if (!base) {
      alert('Enter a valid base send time');
      return;
    }
    setKlaviyoSchedule((prev) =>
      gen.emails.map((email, idx) => ({
        step: email.step || idx + 1,
        variant: prev[idx]?.variant || 'A',
        sendAt: toLocalInputValue(addDays(base, email.delayDays || 0)),
      }))
    );
  }

  function updateSchedule(index: number, patch: Partial<{ variant: 'A'|'B'; sendAt: string }>) {
    setKlaviyoSchedule((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  }

  async function handleSendToKlaviyo() {
    if (!gen) return alert('Generate a sequence first');
    if (!klaviyoListId.trim() && !klaviyoSegmentId.trim()) {
      alert('Enter a Klaviyo list or segment ID');
      return;
    }
    const schedulePayload = [];
    for (let i = 0; i < klaviyoSchedule.length; i++) {
      const cfg = klaviyoSchedule[i];
      const email = gen.emails[i];
      if (!cfg || !cfg.sendAt) {
        alert(`Set a send time for step ${cfg?.step || i + 1}`);
        return;
      }
      const sendDate = parseLocalInput(cfg.sendAt);
      if (!sendDate) {
        alert(`Invalid send time for step ${cfg.step}`);
        return;
      }
      const subject =
        cfg.variant === 'B'
          ? (email.subjectB || email.subjectA || '')
          : (email.subjectA || email.subjectB || '');
      if (!subject) {
        alert(`Missing subject for step ${cfg.step}`);
        return;
      }
      schedulePayload.push({
        step: email.step || i + 1,
        subject,
        preheader: email.preheader,
        html: email.html,
        text: email.text,
        sendAt: sendDate.toISOString(),
        variant: cfg.variant,
      });
    }
    if (!schedulePayload.length) {
      alert('No steps to push');
      return;
    }
    setKlaviyoSubmitting(true);
    try {
      const res = await fetch('/api/mailpilot/klaviyo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: klaviyoListId.trim() || undefined,
          segmentId: klaviyoSegmentId.trim() || undefined,
          sequenceName: title?.trim() || `${sender_company || 'GrowthPilot'} campaign`,
          sender: { sender_name, sender_company, sender_email },
          emails: schedulePayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to push to Klaviyo');
      alert('Sequence scheduled via Klaviyo!');
      setShowKlaviyoModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to push to Klaviyo');
    } finally {
      setKlaviyoSubmitting(false);
    }
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
          useMergeTags: recipients.length > 0,
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

  async function deleteCampaign(id: string) {
    if (!window.confirm('Delete this campaign from history?')) return;
    const res = await fetch('/api/mailpilot/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data?.error || 'Delete failed');
    await loadHistory();
  }

  const activeEmail = useMemo(() => {
    if (!gen?.emails?.length) return null;
    return gen.emails[Math.min(activeStepIdx, gen.emails.length-1)];
  }, [gen, activeStepIdx]);

  const selectedRecipient = useMemo(() => {
    if (recipientIdx < 0) return null;
    return recipients[recipientIdx] || null;
  }, [recipients, recipientIdx]);

  const personalizedEmail = useMemo(() => {
    if (!activeEmail) return null;
    if (!selectedRecipient) return activeEmail;
    const vars: Record<string, string> = {
      first_name: selectedRecipient.first_name || '',
      last_name: selectedRecipient.last_name || '',
      company: selectedRecipient.company || '',
      email: selectedRecipient.email || '',
      offer: offer || '',
      sender_name,
      sender_company,
      sender_email,
    };
    return {
      ...activeEmail,
      subjectA: applyMergeTags(activeEmail.subjectA || '', vars),
      subjectB: applyMergeTags(activeEmail.subjectB || '', vars),
      preheader: applyMergeTags(activeEmail.preheader || '', vars),
      html: applyMergeTags(activeEmail.html || '', vars),
      text: applyMergeTags(activeEmail.text || htmlToText(activeEmail.html || ''), vars),
    };
  }, [activeEmail, selectedRecipient, offer, sender_name, sender_company, sender_email]);

  return (
    <>
    <section className="relative overflow-hidden">
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">MailPilot</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          AI email campaigns <span className="text-[color:var(--gold,theme(colors.brand.gold))]">ready to send</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Outreach, newsletters, or nurture sequences with subject A/B, preheaders, spam check, and exports.
        </p>

        {brandProfile && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-brand-muted">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide">
              <span>BrandPilot profile</span>
              <a className="text-brand-muted underline hover:text-white" href="/brandpilot">
                Edit
              </a>
            </div>
            <div className="mt-2 text-white text-base font-medium">{brandProfile.company || 'Saved brand profile'}</div>
            {brandProfile.vibe && (
              <div className="mt-1">Vibe keywords: <span className="text-white/90">{brandProfile.vibe}</span></div>
            )}
            {(brandProfile.voiceSelected?.length || brandProfile.voice?.length) && (
              <div className="mt-1">
                Tone:
                <span className="text-white/90">
                  {' '}
                  {(brandProfile.voiceSelected?.length ? brandProfile.voiceSelected : brandProfile.voice)?.join(', ')}
                </span>
              </div>
            )}
            <div className="mt-1 text-xs text-brand-muted">Defaults auto-fill MailPilot fields.</div>
          </div>
        )}

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
            <div className="text-sm text-brand-muted mb-1">Sender / merge snippets</div>
            <div className="grid grid-cols-3 gap-3">
              <input className="rounded-md border p-2.5" placeholder="Name" value={sender_name} onChange={e=>setSenderName(e.target.value)} />
              <input className="rounded-md border p-2.5" placeholder="Company" value={sender_company} onChange={e=>setSenderCompany(e.target.value)} />
              <input className="rounded-md border p-2.5" placeholder="Email" value={sender_email} onChange={e=>setSenderEmail(e.target.value)} />
            </div>
            {gen?.mergeVars?.length ? (
              <div className="mt-3 text-xs text-brand-muted space-y-1">
                <div>Available merge tags when editing emails:</div>
                <div className="flex flex-wrap gap-2">
                  {gen.mergeVars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px] hover:bg-white/5"
                    >
                      {'{{'}{v}{'}}'}
                    </button>
                  ))}
                </div>
                <p>Paste emails into ESPs that support merge fields, or replace tags manually before sending.</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-brand-muted">
                Use tags like <code>{'{{first_name}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{sender_name}}'}</code> directly in the editor before exporting/sending.
              </p>
            )}
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
              {parsedCount > 0 && (
                <>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      const header = 'email,first_name,last_name,company\n';
                      const rows = recipients.map((r) => [
                        r.email || '',
                        r.first_name || '',
                        r.last_name || '',
                        r.company || '',
                      ].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
                      downloadFile('mailpilot_recipients.csv', header + rows, 'text/csv;charset=utf-8;');
                    }}
                  >
                    Export CSV
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => downloadFile('mailpilot_recipients.json', JSON.stringify(recipients, null, 2), 'application/json')}
                  >
                    Export JSON
                  </button>
                </>
              )}
            </div>
            {parsedCount > 0 && (
              <div className="mt-3 max-h-44 overflow-auto rounded-md border border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 text-brand-muted">
                    <tr>
                      <th className="text-left font-normal px-2 py-1">Email</th>
                      <th className="text-left font-normal px-2 py-1">First</th>
                      <th className="text-left font-normal px-2 py-1">Last</th>
                      <th className="text-left font-normal px-2 py-1">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.slice(0, 25).map((r, idx) => (
                      <tr key={`${r.email}-${idx}`} className="border-t border-white/5">
                        <td className="px-2 py-1">{r.email}</td>
                        <td className="px-2 py-1">{r.first_name || '-'}</td>
                        <td className="px-2 py-1">{r.last_name || '-'}</td>
                        <td className="px-2 py-1">{r.company || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedCount > 25 && (
                  <div className="px-2 py-1 text-[11px] text-brand-muted">Showing first 25 recipients.</div>
                )}
              </div>
            )}

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
                <button className="btn-ghost" onClick={()=>setShowKlaviyoModal(true)}>
                  Send to Klaviyo
                </button>
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
            {personalizedEmail && (
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-sm">
                    <div className="text-brand-muted">Subject {activeVariant}:</div>
                    <div className="font-medium break-words">
                      {activeVariant === 'A' ? personalizedEmail.subjectA : personalizedEmail.subjectB}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-brand-muted">Preheader:</div>
                    <div className="break-words">{personalizedEmail.preheader}</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-brand-muted mb-1">HTML preview</div>
                    <div className="rounded-md border overflow-hidden bg-white text-black">
                      {/* Keep it simple: render HTML directly */}
                      <iframe
                        className="w-full h-[360px] bg-white"
                        srcDoc={personalizedEmail.html}
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <div className="text-sm text-brand-muted">Actions</div>
                  {recipients.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-brand-muted mb-1">Preview as recipient</div>
                      <select
                        className="w-full rounded-md border p-2.5 text-sm"
                        value={recipientIdx}
                        onChange={(e)=>setRecipientIdx(Number(e.target.value))}
                      >
                        <option value={-1}>No personalization</option>
                        {recipients.map((r, idx) => (
                          <option key={`${r.email}-${idx}`} value={idx}>
                            {r.email || `Recipient ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {/* Save was above; here we include handy copies */}
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(activeVariant==='A' ? personalizedEmail.subjectA : personalizedEmail.subjectB)}>
                      Copy Subject {activeVariant}
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(personalizedEmail.preheader)}>
                      Copy Preheader
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(personalizedEmail.html)}>
                      Copy HTML
                    </button>
                    <button className="btn-ghost" onClick={()=>navigator.clipboard.writeText(personalizedEmail.text || htmlToText(personalizedEmail.html))}>
                      Copy Text
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-brand-muted">
                    Tip: Save first, then use History actions to export **.html / .eml**.
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
                      <button className="btn-ghost text-red-300" onClick={()=>deleteCampaign(h._id)}>Delete</button>
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

      {showKlaviyoModal && gen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>!klaviyoSubmitting && setShowKlaviyoModal(false)} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#10131c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-brand-muted">MailPilot → Klaviyo</div>
                <h3 className="text-xl font-semibold text-white mt-1">Send sequence to Klaviyo</h3>
                <p className="text-sm text-brand-muted mt-1">
                  Requires <code>KLAVIYO_API_KEY</code> on the server. Choose your list/segment and confirm send times for each step.
                </p>
              </div>
              <button className="btn-ghost" onClick={()=>setShowKlaviyoModal(false)} disabled={klaviyoSubmitting}>
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-brand-muted mb-1 block">List ID</label>
                  <input
                    className="w-full rounded-md border p-2.5"
                    placeholder="List ID from Klaviyo"
                    value={klaviyoListId}
                    onChange={(e)=>setKlaviyoListId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-brand-muted mb-1 block">Segment ID (optional)</label>
                  <input
                    className="w-full rounded-md border p-2.5"
                    placeholder="Segment/flow audience"
                    value={klaviyoSegmentId}
                    onChange={(e)=>setKlaviyoSegmentId(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-brand-muted">If both are set, segment takes priority.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-sm text-brand-muted mb-1 block">Base send time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border p-2.5"
                    value={klaviyoBaseStart}
                    onChange={(e)=>setKlaviyoBaseStart(e.target.value)}
                  />
                </div>
                <button className="btn-ghost" onClick={()=>applyBaseToSchedule()}>
                  Apply delays
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                {klaviyoSchedule.map((row, idx) => {
                  const email = gen.emails[idx];
                  return (
                    <div key={`${row.step}-${idx}`} className="rounded-lg border border-white/10 p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="font-medium text-white">
                          Email {row.step} {email.delayDays ? `( +${email.delayDays}d )` : ''}
                        </div>
                        <div className="text-brand-muted">
                          Preheader: <span className="text-white/80">{email.preheader}</span>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Subject variant</label>
                          <select
                            className="w-full rounded-md border p-2.5"
                            value={row.variant}
                            onChange={(e)=>updateSchedule(idx, { variant: e.target.value as 'A'|'B' })}
                          >
                            <option value="A">Use Subject A</option>
                            <option value="B">Use Subject B</option>
                          </select>
                          <div className="mt-1 text-xs text-brand-muted">
                            {row.variant === 'B' ? (email.subjectB || email.subjectA) : (email.subjectA || email.subjectB)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Send time</label>
                          <input
                            type="datetime-local"
                            className="w-full rounded-md border p-2.5"
                            value={row.sendAt}
                            onChange={(e)=>updateSchedule(idx, { sendAt: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!klaviyoSchedule.length && (
                  <div className="rounded-md border border-white/10 p-3 text-sm text-brand-muted">
                    Generate a sequence first to configure Klaviyo scheduling.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={()=>setShowKlaviyoModal(false)} disabled={klaviyoSubmitting}>
                  Cancel
                </button>
                <button className="btn-gold" onClick={handleSendToKlaviyo} disabled={klaviyoSubmitting || !klaviyoSchedule.length}>
                  {klaviyoSubmitting ? 'Sending…' : 'Push to Klaviyo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
