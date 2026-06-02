'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Msg = { role: 'user' | 'assistant'; content: string };

const initialMessage: Msg = {
  role: 'assistant',
  content: 'Hi! Ask me anything about GrowthPilot — plans, modules, billing, or setup.',
};

const PREVIEW_CLASS = 'leadpilot-preview-open';

function GPAvatar() {
  return (
    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #D4AF37 100%)' }}>
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black">
        <path fill="currentColor" d="M13 10h5l-7 11v-7H6l7-11v7Z"/>
      </svg>
    </div>
  );
}

export default function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [hide, setHide] = useState(false);

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
    setUnread(false);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
    });
  };

  async function send() {
    if (!input.trim() || loading) return;
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
      const reply: Msg = { role: 'assistant', content: data.reply || 'Could not find that — please try rephrasing.' };
      setMessages(prev => [...prev, reply]);
      if (!open) setUnread(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  const onEmbedPage = pathname?.startsWith('/leadpilot/embed');
  const shouldHide  = onEmbedPage || hide;
  if (shouldHide) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
      )}

      {/* Chat panel */}
      <div
        className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          height: open ? '520px' : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
          background: 'linear-gradient(160deg, #0a0f1e 0%, #060c1a 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #D4AF37 100%)' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black">
                <path fill="currentColor" d="M13 10h5l-7 11v-7H6l7-11v7Z"/>
              </svg>
            </div>
            <div>
              <div className="text-white text-sm font-semibold leading-none">GrowthPilot</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-[11px] text-white/50">Support · Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'items-start'}`}>
              {m.role === 'assistant' && <GPAvatar />}
              <div
                className="text-sm leading-relaxed px-3.5 py-2.5 max-w-[82%]"
                style={{
                  borderRadius: m.role === 'assistant' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                  background: m.role === 'assistant'
                    ? 'rgba(255,255,255,0.07)'
                    : 'linear-gradient(135deg, rgba(20,184,166,0.9) 0%, rgba(20,184,166,0.75) 100%)',
                  color: '#fff',
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-start">
              <GPAvatar />
              <div className="px-4 py-3 rounded-[4px_18px_18px_18px] bg-white/7">
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"
                      style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex gap-2 items-center bg-white/5 rounded-2xl px-3 py-1.5 border border-white/10 focus-within:border-white/20 transition">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none py-1"
              placeholder="Ask about pricing, modules…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #D4AF37)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div className="text-center text-[10px] text-white/20 mt-1.5">GrowthPilot AI · Esc to close</div>
        </div>
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #D4AF37 100%)' }}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-black">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-black">
            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        )}
        {unread && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white" />
        )}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
