'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Msg = { role: 'user' | 'assistant'; content: string };

const initialMessage: Msg = {
  role: 'assistant',
  content: 'Hi! I can answer questions about GrowthPilot plans, modules, billing, and setup. Ask me anything.',
};

const PREVIEW_CLASS = 'leadpilot-preview-open';

export default function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hide, setHide] = useState(false);

  // Hide when LeadPilot preview is active (body class controlled from that page)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => setHide(document.body.classList.contains(PREVIEW_CLASS));
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    check();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const onEmbedPage = pathname?.startsWith('/leadpilot/embed');
  const shouldHide = onEmbedPage || hide || (typeof document !== 'undefined' && document.body.classList.contains(PREVIEW_CLASS));
  if (shouldHide) return null;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
    });
  };

  async function send() {
    if (!input.trim()) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json().catch(() => ({}));
      const reply: Msg = { role: 'assistant', content: data.reply || 'Hmm, I could not find that. Could you rephrase?' };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again later.' }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="rounded-full px-4 py-2 bg-[color:var(--gold,theme(colors.brand.gold))] text-black font-medium shadow-lg hover:brightness-110 transition"
        >
          {open ? 'Close Support' : 'Ask GrowthPilot'}
        </button>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[90vw] h-[520px] rounded-3xl border border-black/10 dark:border-white/10 bg-white text-black dark:bg-[rgba(6,10,20,0.95)] dark:text-white shadow-[0_20px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-black/40 dark:text-white/50">GrowthPilot</div>
              <div className="text-base font-semibold">Support Copilot</div>
            </div>
            <button
              type="button"
              aria-label="Close support chat"
              className="rounded-full bg-black/10 text-black px-2 py-1 text-sm hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 space-y-3 bg-transparent">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'assistant'
                    ? 'bg-black/5 text-black dark:bg-white/10 dark:text-white'
                    : 'bg-[color:var(--gold,theme(colors.brand.gold))]/20 ml-auto text-black dark:text-white'
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-black/10 bg-black/5 dark:border-white/10 dark:bg-black/30">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-full border border-black/20 bg-transparent px-4 py-2 text-sm focus:outline-none dark:border-white/20"
                placeholder="Ask about pricing, modules, billing…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                disabled={loading}
              />
              <button
                type="button"
                className="btn-gold rounded-full px-4"
                onClick={send}
                disabled={loading}
              >
                {loading ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
