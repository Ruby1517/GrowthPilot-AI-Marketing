'use client'
import { useState } from 'react'

export default function Dashboard() {
  const [title, setTitle] = useState('')
  const [queuedId, setQueuedId] = useState<string | null>(null)

  async function queueBlog() {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'blog_draft', payload: { title } })
    })
    const j = await res.json()
    setQueuedId(j.jobId)
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard</h2>
            <p className="text-brand-muted text-sm">Quick actions to test queues and generation.</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="Blog title"
            className="w-full rounded-xl border border-[color:var(--card-stroke,rgba(255,255,255,0.08))] bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
          />
          <button onClick={queueBlog} className="btn-gold">Queue Blog Draft</button>
        </div>
        {queuedId && <p className="mt-3 text-sm text-brand-muted">Queued: {queuedId}</p>}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {['Posts','Clips','Blogs'].map((k,i)=>(
          <div className="card p-6" key={i}>
            <div className="text-sm text-brand-muted">Module</div>
            <div className="text-lg font-medium">{k}</div>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Organization</div>
            <div className="text-lg font-medium">Team & Invites</div>
          </div>
          <a href="/dashboard/team" className="btn-gold">Manage Team</a>
        </div>
      </div>
    </div>
  )
}
