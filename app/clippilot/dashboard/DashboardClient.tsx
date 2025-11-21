"use client";

import { useMemo, useState } from "react";

type ClipOutputDTO = {
  _id: string;
  jobId: string;
  index: number;
  aspect: string;
  durationSec: number;
  title: string;
  hook: string;
  hashtags: string[];
  captionText: string;
  thumbnailKey: string | null;
  thumbnailText: string;
  publishTargets: string[];
  url: string;
  createdAt: string;
};

export default function DashboardClient({ initialOutputs }: { initialOutputs: ClipOutputDTO[] }) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return initialOutputs;
    const q = filter.toLowerCase();
    return initialOutputs.filter((o) =>
      [o.title, o.hook, o.captionText, o.hashtags.join(" ")].some((txt) => txt.toLowerCase().includes(q))
    );
  }, [initialOutputs, filter]);

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">ClipPilot — Publishing Dashboard</h1>
            <p className="text-sm text-brand-muted">Review clips, captions, hashtags, thumbnails, and publish when ready.</p>
          </div>
          <a href="/clippilot" className="btn-gold text-sm">+ New Clip Job</a>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title, hook, hashtag…"
          className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
        />
      </header>

      <div className="grid gap-5">
        {filtered.map((clip) => (
          <article key={clip._id} className="card p-4 grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="space-y-3">
              {clip.thumbnailKey ? (
                <img
                  src={`/api/assets/view?key=${encodeURIComponent(clip.thumbnailKey)}`}
                  alt={clip.thumbnailText || clip.title || "Thumbnail"}
                  className="w-full aspect-square object-cover rounded-xl border border-white/10"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-dashed border-white/15 flex items-center justify-center text-xs text-brand-muted">
                  No thumbnail
                </div>
              )}
              <div className="text-xs text-brand-muted space-y-1">
                <div>Aspect <b>{clip.aspect}</b> · {clip.durationSec}s</div>
                <div>Created {clip.createdAt ? new Date(clip.createdAt).toLocaleString() : "-"}</div>
              </div>
              <a className="btn-ghost w-full text-center" href={clip.url} target="_blank" rel="noopener noreferrer">Download MP4</a>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Title</p>
                <h2 className="text-lg font-semibold">{clip.title || "Untitled clip"}</h2>
              </div>
              {clip.hook && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Hook</p>
                  <p className="text-sm">{clip.hook}</p>
                </div>
              )}
              {clip.captionText && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Caption</p>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm whitespace-pre-wrap">{clip.captionText}</div>
                </div>
              )}
              {!!clip.hashtags.length && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted mb-1">Hashtags</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {clip.hashtags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {!!clip.publishTargets.length && (
                <p className="text-xs text-brand-muted">Suggested channels: {clip.publishTargets.join(", ")}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn-gold" type="button" onClick={() => navigator.clipboard.writeText(clip.captionText)}>
                  Copy Caption
                </button>
                <button className="btn-ghost" type="button" onClick={() => navigator.clipboard.writeText(clip.hashtags.map((t) => `#${t}`).join(" "))}>
                  Copy Hashtags
                </button>
                <button className="btn-ghost" type="button" disabled>Mark Approved</button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-brand-muted">No clips yet. Upload a video via ClipPilot to get started.</div>
        )}
      </div>
    </div>
  );
}
