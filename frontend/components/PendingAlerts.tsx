'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function PendingAlerts() {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    api.maintenance().then((d) => setItems(d.slice(0, 5))).catch(() => {})
  }, [])
  const color = (u: string) =>
    u === 'critical' ? 'bg-red-50 text-red-600' : u === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Upcoming Maintenance</h3>
      <div className="space-y-2">
        {items.map((m) => (
          <div key={m.task_id} className={`flex items-center justify-between p-2 rounded-lg ${color(m.urgency)}`}>
            <span className="text-sm font-medium text-gray-800">{m.task_id}</span>
            <span className="text-xs uppercase">{m.urgency}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">No pending requests.</p>}
      </div>
      <p className="mt-3 text-xs text-gray-400">{items.length} request(s) · Bhadrak–Jajpur corridor</p>
    </div>
  )
}
