export type FAQ = { q: string; a: string; tags?: string[] };

// Seed FAQ list; replace with your own content or wire to a CMS/DB.
export const DEFAULT_FAQS: FAQ[] = [
  { q: 'What is LeadPilot?', a: 'LeadPilot is your onsite AI concierge. It answers common questions, captures leads, and can hand off to a human when needed.' },
  { q: 'How do I embed it?', a: 'Copy the embed snippet from the LeadPilot page in your dashboard and paste it before </body> on the pages you want the widget to appear.' },
  { q: 'Do you support bookings?', a: 'Yes. Share your booking link in settings (BOOKING_URL env) and we will surface it when users ask to schedule.' },
  { q: 'How are leads routed?', a: 'Leads are stored in your dashboard and can be forwarded via email, Slack/webhook, or CRM if configured.' },
  { q: 'What plan limits apply?', a: 'LeadPilot usage is metered by conversations. Higher plans increase the monthly conversation cap.' },
];

export function findFAQ(userText: string): FAQ | null {
  if (!userText.trim()) return null;
  const text = userText.toLowerCase();

  // Simple keyword matching; replace with embeddings for better relevance.
  const candidates = DEFAULT_FAQS.map((f) => {
    const score =
      (f.tags || []).reduce((s, t) => (text.includes(t.toLowerCase()) ? s + 2 : s), 0) +
      (text.includes(f.q.toLowerCase()) ? 3 : 0);
    const words = f.q.toLowerCase().split(/\s+/);
    const hitWords = words.filter((w) => text.includes(w)).length;
    return { faq: f, score: score + hitWords };
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 2 ? best.faq : null;
}
