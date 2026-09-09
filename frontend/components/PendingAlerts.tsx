'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const urgencyStyle = (u: string) =>
  u === 'critical'
    ? { bar: 'border-rose-500', badge: 'bg-rose-100 text-rose-700' }
    : u === 'high'
      ? { bar: 'border-amber-500', badge: 'bg-amber-100 text-amber-700' }
      : { bar: 'border-primary-500', badge: 'bg-primary-100 text-primary-700' }

export default function PendingAlerts() {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    api.maintenance().then((d) => setItems(d.slice(0, 5))).catch(() => {})
  }, [])
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Upcoming Maintenance</h3>
      <div className="space-y-3">
        {items.map((m) => {
          const s = urgencyStyle(m.urgency)
          return (
            <div
              key={m.task_id}
              className={`flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 border-l-4 ${s.bar} shadow-sm transition-shadow hover:shadow-md`}
            >
              <div>
                <span className="text-sm font-medium text-slate-800">{m.task_id}</span>
                <span className="text-xs text-slate-500 block">{m.department} · {m.work_type}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full uppercase tracking-wide ${s.badge}`}>
                {m.urgency}
              </span>
            </div>
          )
        })}
        {items.length === 0 && <p className="text-sm text-slate-400">No pending requests.</p>}
      </div>
      <p className="mt-4 text-xs text-slate-400">{items.length} request(s) · Bhadrak–Jajpur corridor</p>
    </div>
  )
}
