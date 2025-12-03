'use client';

import { useState } from "react";

type Props = {
  id: string;
  onDeleted?: () => void;
};

export default function ClipDeleteButton({ id, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deleted) return null;

  async function handleDelete() {
    const ok = window.confirm("Delete this clip? This cannot be undone.");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clippilot/library/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Delete failed");
      }
      setDeleted(true);
      onDeleted?.();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        className="btn-ghost text-rose-400 border border-rose-400/30"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-rose-400">{error}</span>}
    </div>
  );
}
