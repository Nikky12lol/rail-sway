import { Activity, Train, Clock, AlertTriangle } from 'lucide-react'

export default function StatsCards({ stats }: { stats?: { total: number; onTime: number; delayed: number; pending: number } }) {
  const s = stats || { total: 24, onTime: 18, delayed: 6, pending: 3 }
  const cards = [
    { icon: Train, value: s.total, label: 'Total Trains', bg: 'bg-blue-50', fg: 'text-blue-600' },
    { icon: Activity, value: s.onTime, label: 'On Time', bg: 'bg-green-50', fg: 'text-green-600' },
    { icon: Clock, value: s.delayed, label: 'Delayed', bg: 'bg-red-50', fg: 'text-red-600' },
    { icon: AlertTriangle, value: s.pending, label: 'Maintenance Pending', bg: 'bg-orange-50', fg: 'text-orange-600' },
  ]
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map(({ icon: Icon, value, label, bg, fg }) => (
        <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
          <div className={`p-3 ${bg} rounded-lg`}><Icon className={`w-6 h-6 ${fg}`} /></div>
          <div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
        </div>
      ))}
    </div>
  )
}
