'use client';

import React, { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

const base = process.env.NEXT_PUBLIC_APP_URL || '';

export default function LeadEmbedPage() {
  // read query params on client
  const [pb, setPb] = useState('homepage');
  const [site, setSite] = useState('');
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setPb(sp.get('pb') || 'homepage');
    setSite(sp.get('site') || window.location.hostname || '');
  }, []);

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! How can I help today?' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  // lead capture fields
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');

  const boxRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      boxRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
    });
  };

  function push(m: Msg) {
    setMessages((prev) => [...prev, m]);
    scrollToBottom();
  }

  async function send() {
    if (!input.trim()) return;
    const user = { role: 'user', content: input.trim() } as Msg;
    setInput('');
    push(user);
    setPending(true);
    try {
      const r = await fetch(`${base}/api/leadpilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook: pb, site, messages: [...messages, user] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Chat failed');
      push({ role: 'assistant', content: j.reply || 'Thanks! Can I grab your name, email, and company?' });
      if (j.fallback === true) {
        setShowCapture(true);
        // also nudge with a message
        push({ role: 'assistant', content: "I can connect you with our team. What's your name, email, and company?" });
      }
    } catch {
      push({ role: 'assistant', content: 'Sorry—something went wrong.' });
    } finally {
      setPending(false);
    }
  }

  async function submitLead(e?: React.FormEvent) {
    e?.preventDefault();
    if (!leadEmail.trim()) {
      alert('Please enter an email');
      return;
    }
    try {
      await fetch(`${base}/api/leadpilot/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook: pb,
          site,
          name: leadName,
          email: leadEmail,
          company: leadCompany,
          transcript: messages,
        }),
      });
      setShowCapture(false);
      setLeadName('');
      setLeadEmail('');
      setLeadCompany('');
      push({ role: 'assistant', content: 'Thanks! Our team will reach out shortly.' });
    } catch {
      alert('Failed to submit lead. Please try again.');
    }
  }

  return (
    <div className="h-screen w-screen bg-[rgba(18,18,18,0.96)] text-white rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.1)] font-medium">
        LeadPilot • {pb}
      </div>

      {/* Messages */}
      <div ref={boxRef} className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'assistant'
                ? 'max-w-[85%] rounded-lg bg-[rgba(255,255,255,0.06)] p-2'
                : 'max-w-[85%] ml-auto rounded-lg bg-[rgba(255,215,0,0.15)] p-2'
            }
          >
            {/* make links clickable */}
            {m.content.split(/\s+/).map((tok, idx) => {
              const isLink = /^https?:\/\//i.test(tok);
              return isLink ? (
                <a key={idx} href={tok} target="_blank" rel="noreferrer" className="underline">
                  {tok}{' '}
                </a>
              ) : (
                tok + ' '
              );
            })}
          </div>
        ))}

        {/* Lead capture form (shown when fallback = true) */}
        {showCapture && (
          <form
            onSubmit={submitLead}
            className="mt-3 rounded-lg bg-[rgba(255,255,255,0.06)] p-3 space-y-2 max-w-[85%]"
          >
            <div className="text-sm font-medium mb-1">Share your details and we’ll follow up:</div>
            <input
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-md border border-[rgba(255,255,255,0.15)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="Email"
              type="email"
              required
              className="w-full rounded-md border border-[rgba(255,255,255,0.15)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={leadCompany}
              onChange={(e) => setLeadCompany(e.target.value)}
              placeholder="Company"
              className="w-full rounded-md border border-[rgba(255,255,255,0.15)] bg-transparent px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-gold text-sm">Submit</button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setShowCapture(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-[rgba(255,255,255,0.15)] bg-transparent px-3 py-2"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn-gold" disabled={pending} onClick={send}>
            {pending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
