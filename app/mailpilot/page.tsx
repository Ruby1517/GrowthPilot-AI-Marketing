'use client';

import { useEffect, useState } from 'react';
import IterationPanel from '@/components/IterationPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  emails: EmailItem[];
  spam: { score: number; hits: string[] };
};

type Campaign = {
  _id: string;
  type: string;
  offer?: string;
  createdAt: string;
  emails: { subjectA: string }[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_TYPES = [
  { value: 'newsletter', label: 'Newsletter',  desc: 'Inform & engage subscribers' },
  { value: 'nurture',    label: 'Nurture',     desc: 'Multi-step onboarding or drip' },
  { value: 'cold',       label: 'Cold outreach', desc: 'Introduce to new prospects' },
  { value: 'warm',       label: 'Re-engagement', desc: 'Win back inactive contacts' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function copy(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

function spamColor(score: number) {
  if (score >= 40) return 'text-rose-400';
  if (score >= 20) return 'text-amber-400';
  return 'text-emerald-400';
}

// ── Email step card ───────────────────────────────────────────────────────────

function EmailCard({ email }: { email: EmailItem }) {
  const [copied, setCopied] = useState<string | null>(null);
  const plainText = email.text || htmlToText(email.html);

  function copyField(label: string, text: string) {
    copy(text); setCopied(label); setTimeout(() => setCopied(null), 2000);
  }

  const delayLabel = email.delayDays === 0 ? 'Send immediately'
    : email.delayDays === 1 ? 'Send after 1 day'
    : `Send after ${email.delayDays} days`;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-brand-muted">Email {email.step}</span>
          {email.delayDays !== undefined && (
            <span className="ml-2 text-xs text-brand-muted opacity-60">· {delayLabel}</span>
          )}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-brand-muted uppercase tracking-wide">Subject</div>
          <button onClick={() => copyField('subject', email.subjectA)} className="btn-ghost text-xs">
            {copied === 'subject' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="text-sm font-medium">{email.subjectA}</div>
        {email.preheader && (
          <div className="text-xs text-brand-muted">{email.preheader}</div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-brand-muted uppercase tracking-wide">Body</div>
          <button onClick={() => copyField('body', plainText)} className="btn-ghost text-xs">
            {copied === 'body' ? '✓ Copied' : 'Copy text'}
          </button>
        </div>
        <div className="text-sm text-white/85 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
          {plainText}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MailPilotPage() {
  const [emailType, setEmailType] = useState<typeof EMAIL_TYPES[number]['value']>('newsletter');
  const [steps,     setSteps]     = useState(3);
  const [offer,     setOffer]     = useState('');
  const [audience,  setAudience]  = useState('');
  const [senderName,    setSenderName]    = useState('');
  const [senderCompany, setSenderCompany] = useState('');

  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [gen,      setGen]      = useState<Generated | null>(null);
  const [saved,    setSaved]    = useState(false);

  const [history,     setHistory]     = useState<Campaign[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSender,  setShowSender]  = useState(false);

  const isNurture = emailType === 'nurture';

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!offer.trim()) { setErr('Describe your offer or email goal.'); return; }
    setLoading(true); setErr(null); setGen(null); setSaved(false);
    try {
      const r = await fetch('/api/mailpilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          offer: offer.trim(),
          audience: audience.trim() || undefined,
          steps: isNurture ? steps : 1,
          sender: {
            sender_name:    senderName.trim()    || 'The Team',
            sender_company: senderCompany.trim() || undefined,
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generation failed');
      setGen(j.result ?? j);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!gen) return;
    const r = await fetch('/api/mailpilot/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: emailType, offer, emails: gen.emails, spam: gen.spam }),
    });
    if (r.ok) { setSaved(true); loadHistory(); }
    else alert((await r.json())?.error || 'Save failed');
  }

  async function loadHistory() {
    const r = await fetch('/api/mailpilot/list', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    setHistory(j.items || []);
  }

  async function deleteHistory(id: string) {
    if (!confirm('Delete this campaign?')) return;
    setHistory(h => h.filter(x => x._id !== id));
    await fetch(`/api/mailpilot/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  }

  useEffect(() => { loadHistory(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">MailPilot</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Write email campaigns and sequences in seconds — ready to copy into any ESP.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={generate} className="card p-6 space-y-5">

        {/* Email type */}
        <div>
          <label className="text-sm font-medium block mb-2">What kind of email?</label>
          <div className="grid grid-cols-2 gap-2">
            {EMAIL_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setEmailType(t.value)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  emailType === t.value
                    ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8 text-white'
                    : 'border-white/10 text-brand-muted hover:border-white/20'
                }`}
              >
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs opacity-60 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Nurture steps */}
        {isNurture && (
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Number of emails in sequence</label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} type="button" onClick={() => setSteps(n)}
                  className={`w-9 h-9 rounded-lg border text-sm transition ${steps === n ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-brand-muted hover:border-white/20'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offer */}
        <div>
          <label className="text-sm font-medium block mb-1.5">
            {emailType === 'newsletter' ? 'What is this newsletter about?' :
             emailType === 'cold'       ? 'What are you pitching?' :
             emailType === 'warm'       ? 'Why are you reaching back out?' :
                                          'What is the sequence goal?'}
          </label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] placeholder:text-brand-muted/60 leading-relaxed"
            rows={3}
            placeholder={
              emailType === 'newsletter' ? "e.g. Monthly product updates and growth tips for SaaS founders" :
              emailType === 'cold'       ? "e.g. GrowthPilot — AI marketing suite. Cuts content creation time by 70%. $49/mo." :
              emailType === 'warm'       ? "e.g. They signed up 30 days ago but never activated. Offering a free onboarding call." :
                                           "e.g. Onboard new users, show key features, drive first campaign creation"
            }
            value={offer}
            onChange={e => setOffer(e.target.value)}
            required
          />
        </div>

        {/* Audience */}
        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Target audience <span className="opacity-60">(optional)</span></label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
            placeholder="e.g. startup founders, marketing managers at B2B SaaS"
            value={audience}
            onChange={e => setAudience(e.target.value)}
          />
        </div>

        {/* Sender details — collapsed */}
        <div>
          <button type="button" onClick={() => setShowSender(v => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition">
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${showSender ? 'rotate-180' : ''}`}>
              <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
            </svg>
            Sender details
          </button>
          {showSender && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-brand-muted block mb-1">Sender name</label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
                  placeholder="Alex at GrowthPilot"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-brand-muted block mb-1">Company</label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
                  placeholder="GrowthPilot"
                  value={senderCompany}
                  onChange={e => setSenderCompany(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {err && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{err}</div>
        )}

        <button type="submit" disabled={loading || !offer.trim()}
          className="w-full btn-gold py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium">
          {loading ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Writing…</>
          ) : `📧 Write ${isNurture ? `${steps}-email sequence` : 'email'}`}
        </button>
      </form>

      {/* Results */}
      {gen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {isNurture ? `${gen.emails.length}-email sequence` : 'Your email'}
            </h2>
            <div className="flex items-center gap-3">
              {/* Spam score */}
              {gen.spam && (
                <span className={`text-xs ${spamColor(gen.spam.score)}`}>
                  Spam: {gen.spam.score}/100
                </span>
              )}
              <button
                onClick={save}
                className={`btn-ghost text-xs ${saved ? 'text-emerald-400' : ''}`}
              >
                {saved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

          {gen.emails.map((email, i) => (
            <EmailCard key={i} email={email} />
          ))}

          <IterationPanel
            module="mailpilot"
            content={gen}
            brief={offer}
            onUpdate={updated => setGen(updated)}
            label="Refine this sequence"
          />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowHistory(v => !v)}
            className="flex items-center justify-between w-full text-sm text-brand-muted hover:text-white transition">
            <span>Saved campaigns ({history.length})</span>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`}>
              <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
            </svg>
          </button>

          {showHistory && (
            <div className="grid gap-3 md:grid-cols-2">
              {history.map(c => (
                <div key={c._id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="text-xs text-brand-muted capitalize">{c.type}</div>
                  <div className="text-sm font-medium line-clamp-2">{c.offer || c.emails?.[0]?.subjectA || '(untitled)'}</div>
                  <div className="text-xs text-brand-muted">{new Date(c.createdAt).toLocaleDateString()} · {c.emails?.length || 0} email{c.emails?.length !== 1 ? 's' : ''}</div>
                  <button onClick={() => deleteHistory(c._id)} className="text-xs text-rose-400 hover:text-rose-300 transition">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
