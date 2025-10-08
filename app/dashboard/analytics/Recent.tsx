'use client';
import { Fragment } from 'react';


export default function Recent({ recent }: { recent: Array<{ _id: { module: string; type: string }, count: number }> }) {
  if (!recent?.length) return null;
  return (
    <div className="card p-4 mt-4">
      <h3 className="font-semibold mb-3">Activity (last 7 days)</h3>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-brand-muted">Module</div>
        <div className="text-brand-muted">Event</div>
        <div className="text-brand-muted text-right">Count</div>
        {recent.map((r, i) => (
          <Fragment key={i}>
            <div className="capitalize">{r._id.module}</div>
            <div className="opacity-80">{r._id.type}</div>
            <div className="text-right">{r.count}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
