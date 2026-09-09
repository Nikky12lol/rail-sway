'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function ImpactTimeline({ windows }: { windows: any[] }) {
  const data = windows.map((w, i) => ({
    name: `Opt ${String.fromCharCode(65 + i)}`,
    affected: w.affected_trains,
    priority: w.priority_affected,
    delay: w.estimated_delay,
    score: w.impact_score,
  }))
  if (!data.length) return <p className="text-sm text-slate-400">No data.</p>
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgb(15 23 42 / 0.08)' }}
          />
          <Bar dataKey="affected" name="Affected trains" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#4f46e5' : '#c7d2fe'} />
            ))}
          </Bar>
          <Bar dataKey="priority" name="Priority trains" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
