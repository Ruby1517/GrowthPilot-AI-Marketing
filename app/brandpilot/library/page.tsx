/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import BrandDeleteButton from "@/components/BrandDeleteButton";
import { presignGet } from "@/lib/s3";

type BrandItem = {
  _id: string;
  company?: string;
  vibe?: string;
  tagline?: string;
  palette?: string[];
  fonts?: string[];
  primary?: string;
  secondary?: string;
  createdAt?: string;
  summary?: string;
  industry?: string;
  voiceSelected?: string[];
  toneSelections?: string[];
  slogans?: string[];
  voiceGuidelines?: string[];
  messagingPillars?: string[];
  sampleCaptions?: string[];
  adCopyShort?: string;
  adCopyLong?: string;
  pdfUrl?: string;
  imageCount?: number;
  images?: Array<{ url?: string; type?: string; key?: string; bucket?: string; region?: string }>;
};

async function getBrandKits(): Promise<BrandItem[]> {
  const session = await auth().catch(() => null);
  if (!session?.user) return [];
  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean().catch(() => null);
  const orgId = (me as any)?.orgId;
  const userId = (session.user as any).id;
  const ownershipFilters: Array<Record<string, any>> = orgId ? [{ orgId }, { userId }] : [{ userId }];
  // Show only completed/usable kits (pdf or generated images)
  const docs = await BrandDoc.find({
    $and: [
      {
        $or: [
          { pdfUrl: { $exists: true, $nin: [null, ""] } },
          { images: { $exists: true, $ne: [] } },
        ],
      },
      {
        $or: ownershipFilters,
      },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean();
  return await Promise.all(
    docs.map(async (d: any) => {
      const rawImages = Array.isArray(d.images) ? d.images.slice(0, 6) : [];
      const images = await Promise.all(
        rawImages.map(async (img: any) => {
          let url = img.url as string | undefined;
          let key = img.key as string | undefined;
          const bucket = img.bucket as string | undefined;
          const region = img.region as string | undefined;

          // Support stored s3://bucket/key style URLs by deriving key/bucket
          if (url?.startsWith("s3://")) {
            try {
              const u = new URL(url);
              key = u.pathname.replace(/^\//, "");
              url = await presignGet(key, 60 * 15, { bucket: u.hostname, region });
            } catch {}
          } else if (!url && key) {
            try {
              url = await presignGet(key, 60 * 15, { bucket, region });
            } catch {}
          }

          return { url, key, type: img.type, bucket, region };
        })
      );
      return {
        _id: String(d._id),
        company: d.company,
        vibe: d.vibe,
        tagline: d.tagline,
        palette: d.palette || [],
        fonts: d.fonts || [],
        primary: d.primary,
        secondary: d.secondary,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
        summary: d.summary,
        industry: d.industry,
        voiceSelected: d.voiceSelected || [],
        toneSelections: d.toneSelections || [],
        slogans: d.slogans || [],
        voiceGuidelines: d.voiceGuidelines || [],
        messagingPillars: d.messagingPillars || [],
        sampleCaptions: d.sampleCaptions || [],
        adCopyShort: d.adCopyShort,
        adCopyLong: d.adCopyLong,
        pdfUrl: d.pdfUrl,
        imageCount: Array.isArray(d.images) ? d.images.length : 0,
        images,
      };
    })
  );
}

export default async function BrandLibraryPage() {
  const kits = await getBrandKits();
  return (
    <section className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">BrandPilot Library</h1>
        <p className="text-slate-600 dark:text-white text-sm">Recent brand kits you generated.</p>
        <div className="pt-2 flex gap-3">
          <a className="btn-gold text-sm" href="/brandpilot">Create New Kit</a>
          <a className="btn-ghost text-sm border border-slate-300 text-slate-900 hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10" href="/brandpilot/landing">Back to BrandPilot</a>
        </div>
      </div>

      {kits.length === 0 && (
        <div className="card p-6 text-sm text-slate-700 dark:text-white">
          No brand kits yet. Create one to see it here.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {kits.map((kit) => (
          <div key={kit._id} className="card p-4 space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-transparent dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{kit.company || "Brand Kit"}</div>
                {kit.tagline && <div className="text-xs text-slate-600 dark:text-white">{kit.tagline}</div>}
                <div className="text-xs text-slate-600 dark:text-white">
                  {kit.vibe || "—"} {kit.industry ? `• ${kit.industry}` : ""}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-white/80">
                {kit.createdAt ? new Date(kit.createdAt).toLocaleString() : ""}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <a className="btn-ghost text-xs border border-slate-300 text-slate-900 hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10" href={`/brandpilot?id=${kit._id}`}>
                Edit / Recreate
              </a>
              <BrandDeleteButton id={kit._id} />
            </div>

            {(kit.palette?.length || kit.primary || kit.secondary) && (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 dark:text-white">Palette</div>
                <div className="flex gap-2 flex-wrap">
                  {kit.palette?.map((hex) => (
                    <div key={hex} className="w-8 h-8 rounded border border-slate-200" style={{ background: hex }} title={hex} />
                  ))}
                  {kit.primary && <div className="px-2 py-1 text-[11px] rounded bg-slate-50 border border-slate-200 text-slate-800 dark:bg-white/5 dark:border-white/20 dark:text-white">Primary: {kit.primary}</div>}
                  {kit.secondary && <div className="px-2 py-1 text-[11px] rounded bg-slate-50 border border-slate-200 text-slate-800 dark:bg-white/5 dark:border-white/20 dark:text-white">Secondary: {kit.secondary}</div>}
                </div>
              </div>
            )}

            {kit.fonts?.length ? (
              <div className="text-xs text-slate-600 dark:text-white">
                Fonts: {kit.fonts.join(", ")}
              </div>
            ) : null}

            {kit.summary && (
              <p className="text-sm text-slate-800 dark:text-white line-clamp-3">{kit.summary}</p>
            )}

            {kit.slogans?.length ? (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Slogans</div>
                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-white space-y-1">
                  {kit.slogans.slice(0, 4).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {kit.voiceGuidelines?.length ? (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Voice Guidelines</div>
                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-white space-y-1">
                  {kit.voiceGuidelines.slice(0, 4).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {kit.messagingPillars?.length ? (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Messaging Pillars</div>
                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-white space-y-1">
                  {kit.messagingPillars.slice(0, 4).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(kit.adCopyShort || kit.adCopyLong) && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Ad Copy</div>
                {kit.adCopyShort && <p className="text-sm text-slate-800 dark:text-white">Short: {kit.adCopyShort}</p>}
                {kit.adCopyLong && <p className="text-sm text-slate-800 dark:text-white line-clamp-3">Long: {kit.adCopyLong}</p>}
              </div>
            )}

            {kit.sampleCaptions?.length ? (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Sample Captions</div>
                <ul className="list-disc list-inside text-sm text-slate-800 dark:text-white space-y-1">
                  {kit.sampleCaptions.slice(0, 3).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(kit.voiceSelected?.length || kit.toneSelections?.length) && (
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-white">
                {kit.voiceSelected?.map((v) => (
                  <span key={v} className="px-2 py-1 rounded border border-slate-200 dark:border-white/25">{v}</span>
                ))}
                {kit.toneSelections?.map((t) => (
                  <span key={t} className="px-2 py-1 rounded border border-slate-200 dark:border-white/25">{t}</span>
                ))}
              </div>
            )}

            {kit.images?.length ? (
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-white">Assets</div>
                <div className="grid grid-cols-3 gap-2">
                  {kit.images.map((img, idx) => (
                    <div key={img.key || img.url || idx} className="border rounded overflow-hidden bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/15">
                      {img.url ? (
                        <img src={img.url} alt={img.type || "Brand asset"} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="h-20 flex items-center justify-center text-[11px] text-slate-600 dark:text-white">No preview</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {kit.pdfUrl && (
              <div className="flex flex-wrap gap-2">
                <a className="btn-ghost text-xs border border-slate-300 text-slate-900 hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10" href={`/api/brandpilot/guide?id=${kit._id}`} target="_blank" rel="noreferrer">
                  Style Guide PDF
                </a>
                <a className="btn-ghost text-xs border border-slate-300 text-slate-900 hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10" href={`/api/brandpilot/export?id=${kit._id}&format=zip`} target="_blank" rel="noreferrer">
                  Download ZIP
                </a>
              </div>
            )}
            {typeof kit.imageCount === "number" && (
              <div className="text-[11px] text-slate-600 dark:text-white">
                Assets generated: {kit.imageCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
