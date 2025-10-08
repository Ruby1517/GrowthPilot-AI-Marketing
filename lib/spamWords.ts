export const SPAM_WORDS = [
  'act now','limited time','free!!!','winner','guarantee','risk-free','cash','cheap',
  'double your','extra income','no credit check','urgent','as seen on','buy direct',
  'this won’t last','lowest price','trial','clearance','congratulations','miracle',
  'no obligation','no hidden','prize','promise you','promo','sex','viagra','weight loss'
];

export function spamScore(text: string) {
  let hits: string[] = [];
  const hay = (text || '').toLowerCase();
  for (const w of SPAM_WORDS) if (hay.includes(w)) hits.push(w);
  const score = Math.min(100, hits.length * 8); // very naive
  return { score, hits };
}
