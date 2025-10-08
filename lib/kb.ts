// lib/kb.ts
import { dbConnect } from "@/lib/db";
import BlogDoc from "@/models/BlogDoc";

/**
 * Fetch lightweight context from recent BlogPilot drafts.
 * - grabs recent docs
 * - naive rank: presence count of message terms in title/outline/draft
 */
export async function fetchBlogContext(queryText: string, limit = 3) {
  await dbConnect();

  const terms = Array.from(
    new Set(
      (queryText || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3)
    )
  );

  const docs = await BlogDoc.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .select("meta.title outline draft")
    .lean();

  function scoreDoc(d: any) {
    const hay = [
      d.meta?.title || "",
      ...(Array.isArray(d.outline) ? d.outline : []),
      (d.draft || "").slice(0, 4000), // cap text
    ]
      .join(" ")
      .toLowerCase();
    const hits = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    return hits;
  }

  const ranked = docs
    .map((d) => ({ d, s: scoreDoc(d) }))
    .filter(x => x.s > 0) // must match something
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ d }) => {
      const outline = (d.outline || []).slice(0, 8).join(" • ");
      const draft = (d.draft || "").replace(/[#*_>`]/g, "").slice(0, 1200);
      return `Title: ${d.meta?.title || "(untitled)"}\nOutline: ${outline}\nBody: ${draft}\n---`;
    });

  return ranked.length
    ? `INTERNAL KNOWLEDGE (summaries from BlogPilot drafts):\n${ranked.join("\n")}`
    : "";
}
