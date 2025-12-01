export const dynamic = "force-dynamic";

import { dbConnect } from "@/lib/db";
import ClipShort from "@/models/ClipShort";
import { presignGet } from "@/lib/s3";

type ShortItem = {
  _id: string;
  videoKey?: string;
  videoUrl?: string;
  plan?: any;
  createdAt?: string;
  voiceScript?: string;
};

async function fetchShorts(): Promise<Array<ShortItem & { signedUrl: string }>> {
  await dbConnect();
  const docs = await ClipShort.find({}).sort({ createdAt: -1 }).limit(20).lean();
  const items: ShortItem[] = docs.map((d: any) => ({
    _id: String(d._id),
    videoKey: d.videoKey,
    videoUrl: d.videoUrl,
    plan: d.plan,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
    voiceScript: d.voiceScript,
  }));

  const withUrls = await Promise.all(
    items.map(async (it) => {
      let signedUrl = it.videoUrl || "";
      if (it.videoKey) {
        try {
          signedUrl = await presignGet(it.videoKey, 60 * 15); // 15 min
        } catch {
          // fall back to stored url if presign fails
        }
      }
      return { ...it, signedUrl };
    })
  );

  return withUrls;
}

export default async function ClipLibraryPage() {
  const items = await fetchShorts();

  return (
    <section className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ClipPilot Library</h1>
        <p className="text-brand-muted text-sm">Recently rendered shorts (private S3; signed for 15 minutes).</p>
      </div>

      {items.length === 0 && (
        <div className="card p-6 text-sm text-brand-muted">No clips found yet. Render a short to see it here.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <div key={it._id} className="card p-4 space-y-3">
            <div className="text-xs text-brand-muted">
              {it.createdAt ? new Date(it.createdAt).toLocaleString() : "—"}
            </div>
            {it.plan && (
              <div className="text-xs text-brand-muted space-y-1">
                <div><b>{it.plan.title || "Clip"}</b></div>
                <div>{it.plan.hook}</div>
                <div>Promo: {it.plan.promoLabel}</div>
                <div>CTA: {it.plan.ctaText}</div>
                <div>Brand: {it.plan.brandTag}</div>
                <div>
                  {it.plan.startSeconds ?? "-"}s → {it.plan.endSeconds ?? "-"}s
                </div>
              </div>
            )}
            {it.voiceScript && (
              <div className="text-xs text-brand-muted">
                Voice script: <span className="text-foreground">{it.voiceScript}</span>
              </div>
            )}
            {it.signedUrl ? (
              <div className="space-y-2">
                <video src={it.signedUrl} controls className="w-full rounded-lg" />
                <a className="btn-ghost text-xs inline-block" href={it.signedUrl} target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
              </div>
            ) : (
              <div className="text-xs text-rose-500">No URL available</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
