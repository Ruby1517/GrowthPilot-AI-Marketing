'use client';

import { useState } from "react";

type Props = { id: string; onDeleted?: () => void };

export default function BrandDeleteButton({ id, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Delete this brand kit? This cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brandpilot/library/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (onDeleted) onDeleted();
      else window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <button
        className="btn-ghost text-rose-400 border border-rose-400/30"
        onClick={onDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-rose-400">{error}</span>}
    </div>
  );
}
