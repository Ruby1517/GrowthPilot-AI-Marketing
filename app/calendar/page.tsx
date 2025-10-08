'use client'
import { useEffect, useState } from 'react'

type Post = {
  _id: string
  topic: string
  tone: string
  scheduledAt?: string
  variants: { platform: string, text: string }[]
  createdAt: string
}

export default function CalendarPage() {
  const [items, setItems] = useState<Post[]>([])
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    const qs = new URLSearchParams({ from: firstDayISO(month), to: lastDayISO(month) })
    fetch('/api/postpilot/list?'+qs.toString()).then(r=>r.json()).then(d=>setItems(d.items || []))
  }, [month])

  function daysInMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()
  }
  const days = Array.from({length: daysInMonth(month)}, (_,i)=>i+1)

  function exportCSV() {
    const rows = items.map(p => [
      p.scheduledAt || '', p.topic, p.tone,
      p.variants.map(v=>v.platform).join('|'),
      p.variants.map(v=>v.text.replace(/\n/g,' ')).join(' || ')
    ])
    const header = 'scheduledAt,topic,tone,platforms,texts\n'
    const body = rows.map(r => r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([header+body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `calendar_${month.getFullYear()}-${month.getMonth()+1}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-ghost" onClick={()=>setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>← Prev</button>
        <div className="text-lg font-semibold">
          {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button className="btn-ghost" onClick={()=>setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>Next →</button>
        <div className="ml-auto">
          <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3">
        {days.map(d => {
          const dateStr = new Date(month.getFullYear(), month.getMonth(), d).toISOString()
          const todays = items.filter(p => p.scheduledAt && sameDay(p.scheduledAt, dateStr))
          return (
            <div key={d} className="card p-3 min-h-[120px]">
              <div className="text-xs text-brand-muted">{d}</div>
              <div className="mt-2 space-y-2">
                {todays.map(p => (
                  <div key={p._id} className="rounded-lg border border-white/10 p-2">
                    <div className="text-xs text-brand-muted">{p.variants.map(v=>v.platform).join(', ')}</div>
                    <div className="text-sm line-clamp-3">{p.variants[0]?.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function sameDay(a: string, b: string) {
  const A = new Date(a), B = new Date(b)
  return A.getFullYear()===B.getFullYear() && A.getMonth()===B.getMonth() && A.getDate()===B.getDate()
}
function firstDayISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function lastDayISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59).toISOString()
}
