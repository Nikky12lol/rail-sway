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
  if (!data.length) return <p className="text-sm text-gray-400">No data.</p>
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="affected" name="Affected trains" fill="#0d9488">
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#0d9488' : '#99f6e4'} />
            ))}
          </Bar>
          <Bar dataKey="priority" name="Priority trains" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
