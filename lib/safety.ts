export function safetyCheck(str: string) {
  const reasons: string[] = [];
  const PROF = /(?:\bfuck\b|\bshit\b|\basshole\b)/i;
  const PII_PHONE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const PII_CARD  = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/;
  if (PROF.test(str)) reasons.push('profanity');
  if (PII_PHONE.test(str)) reasons.push('pii_like_phone');
  if (PII_CARD.test(str)) reasons.push('pii_like_card');
  return { ok: reasons.length === 0, reasons };
}
export function plagiarismHeuristic(text: string) {
  const longQuotes = (text.match(/"[^"]{60,}"/g)?.length || 0) >= 3;
  const lines = text.split('\n').map(s => s.trim()).filter(s => s.length > 200);
  const seen = new Set<string>(); let dup = false;
  for (const l of lines) { if (seen.has(l)) { dup = true; break; } seen.add(l); }
  const ok = !longQuotes && !dup;
  return { ok, reasons: ok ? [] : ['plagiarism_like'] };
}
