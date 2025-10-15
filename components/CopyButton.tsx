'use client';

import { useState } from 'react';

export default function CopyButton({
  text,
  label = 'Copy',
  className = 'btn-ghost',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || '');
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
