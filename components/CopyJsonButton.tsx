'use client';

import { useState } from 'react';

export function CopyJSONButton({
  obj,
  label = 'Copy',
  className = 'btn-ghost',
  pretty = true,
}: {
  obj: any;
  label?: string;
  className?: string;
  pretty?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = pretty ? JSON.stringify(obj ?? {}, null, 2) : JSON.stringify(obj ?? {});
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
