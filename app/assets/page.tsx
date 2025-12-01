// app/assets/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from 'next-auth/react';

type AssetItem = {
  _id: string;
  key: string;
  bucket: string;
  region: string;
  url?: string | null;            // signed URL injected by API
  contentType?: string;
  size?: number;
  etag?: string;
  width?: number;
  height?: number;
  type: "video" | "image" | "audio" | "doc" | "other";
  status: "pending" | "uploaded" | "processing" | "ready" | "failed";
  createdAt: string;
  error?: string;
};

export default function AssetsPage() {
  const { status } = useSession();
  const [items, setItems] = useState<AssetItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [counts, setCounts] = useState({ ready: 0, pending: 0, uploaded: 0, processing: 0, failed: 0 });
  const includePendingRef = useRef(false);

  function showMsg(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2200);
  }

  async function load(reset = false) {
    setLoading(true);
    const params = new URLSearchParams();
    if (cursor && !reset) params.set("cursor", cursor);
    if (includePendingRef.current) params.set("includePending", "1");
    try {
      const r = await fetch(`/api/assets?${params.toString()}`, { cache: "no-store" });
      if (r.status === 401) {
        // not signed in; show prompt and stop
        setItems([]);
        setHasMore(false);
        setCounts({ ready: 0, pending: 0, uploaded: 0, processing: 0, failed: 0 });
        return;
      }
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setCounts(j.counts || {});
      const newItems: AssetItem[] = j.items || [];
      if (reset) setItems(newItems);
      else setItems((p) => [...p, ...newItems]);
      setCursor(j.nextCursor);
      setHasMore(!!j.nextCursor);
    } catch {
      showMsg("err", "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setLoading(false);
      setItems([]);
      return;
    }
    setCursor(null);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(
    () => items.filter((i) => i.key.toLowerCase().includes(filter.toLowerCase())),
    [items, filter]
  );

  const prettySize = (n?: number) => {
    if (n == null) return "";
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const onCopy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      showMsg("ok", "Key copied");
    } catch {
      showMsg("err", "Copy failed");
    }
  };

  const onDelete = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((x) => x._id !== id)); // optimistic
    try {
      const r = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error();
      showMsg("ok", "Deleted");
    } catch {
      setItems(prev); // revert
      showMsg("err", "Delete failed");
    }
  };

  const onRefresh = () => {
    setCursor(null);
    load(true);
  };

  return (
    <section className="relative overflow-hidden">
      {status !== 'authenticated' && (
        <div className="card p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-semibold">Assets</h1>
          <p className="mt-2 text-brand-muted">Please sign in to view your assets.</p>
          <a href="/api/auth/signin?callbackUrl=/assets" className="mt-4 inline-block btn-gold">Sign In</a>
        </div>
      )}
      <div className="card p-8 md:p-12">
        <span className="badge mb-4">Library</span>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
          Your Assets <span className="text-[color:var(--gold,theme(colors.brand.gold))]">at a glance</span>
        </h1>
        <p className="mt-3 max-w-2xl text-brand-muted">
          Browse uploaded files, copy S3 keys, and manage items. Private S3 bucket; reads use signed URLs.
        </p>

        {/* Actions row */}
        <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex gap-2 items-center">
            <input
              placeholder="Filter by key…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 px-3 rounded-md border w-[260px] outline-none focus:ring"
            />
            <button
              className="btn-ghost"
              onClick={() => {
                includePendingRef.current = !includePendingRef.current;
                setCursor(null);
                load(true);
              }}
            >
              {includePendingRef.current ? "Hide Pending" : "Show Pending"}
            </button>
            <button className="btn-ghost" onClick={onRefresh}>Refresh</button>
          </div>

          <div className="md:ml-auto text-sm text-brand-muted">
            Ready: <b>{counts.ready || 0}</b> · Pending: <b>{counts.pending || 0}</b> · Uploaded: <b>{counts.uploaded || 0}</b>
          </div>
        </div>

        {/* Inline “toast” */}
        {msg && (
          <div
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              msg.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                                   "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {filtered.map((it) => (
          <div key={it._id} className="card p-5">
            <div className="text-xs text-brand-muted flex justify-between">
              <span>{it.bucket} • {it.region}</span>
              <span>{new Date(it.createdAt).toLocaleString()}</span>
            </div>

            <div className="mt-3 rounded-md border overflow-hidden">
              <div className="aspect-square bg-gray-50 flex items-center justify-center">
                {it.url ? (
                  it.contentType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt={it.key} className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-4 text-center text-sm">
                      <div className="font-medium">{it.contentType || it.type}</div>
                      <a
                        href={`/api/assets/view?key=${encodeURIComponent(it.key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Open
                      </a>
                    </div>
                  )
                ) : (
                  <div className="text-sm text-brand-muted">
                    {it.status.toUpperCase()}
                    {it.error && <div className="mt-1 text-xs text-red-500">{it.error}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 text-xs break-all">{it.key}</div>
            <div className="mt-1 text-xs text-brand-muted flex justify-between">
              <span>{prettySize(it.size)}</span>
              <span>{it.etag ? `etag ${it.etag.replaceAll('"', "")}` : ""}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="btn-ghost" onClick={() => onCopy(it.key)}>Copy Key</button>
              <a
                className="btn-gold"
                href={`/api/assets/view?key=${encodeURIComponent(it.key)}`}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
              <button
                className="btn-ghost text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => onDelete(it._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Skeletons */}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="card p-5">
              <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
              <div className="mt-3 rounded-md border overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse" />
              </div>
              <div className="mt-3 h-3 w-full rounded bg-gray-200 animate-pulse" />
              <div className="mt-2 h-3 w-28 rounded bg-gray-200 animate-pulse" />
              <div className="mt-4 flex gap-2">
                <div className="h-9 w-24 rounded-md border bg-gray-100 animate-pulse" />
                <div className="h-9 w-20 rounded-md border bg-gray-100 animate-pulse" />
                <div className="h-9 w-20 rounded-md border bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
      </div>

      {/* Load more */}
      <div className="mt-8 flex justify-center">
        {hasMore && (
          <button className="btn-ghost" onClick={() => load(false)}>
            Load more
          </button>
        )}
      </div>
    </section>
  );
}
