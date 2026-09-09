'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function ImpactTimeline({ windows }: { windows: any[] }) {
  const data = windows.map((w, i) => ({
    name: `#${i + 1}`,
    affected: w.affected_trains,
    priority: w.priority_affected,
    delay: w.estimated_delay,
    score: w.impact_score,
  }))
  if (!data.length) return <p className="text-sm text-slate-500">No data.</p>
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B2949" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#1B2949' }} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '0.6rem', border: '1px solid #27375C', background: '#0D1630', color: '#e2e8f0', fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Bar dataKey="affected" name="Affected trains" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#6366f1' : '#3730a3'} />
            ))}
          </Bar>
          <Bar dataKey="priority" name="Priority trains" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
