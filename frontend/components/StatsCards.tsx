import { Activity, Train, Clock, AlertTriangle } from 'lucide-react'

type Stats = { total: number; onTime: number; delayed: number; pending: number }

const cards = [
  { key: 'total' as const, icon: Train, label: 'Total Trains', bg: 'bg-primary-50', fg: 'text-primary-600' },
  { key: 'onTime' as const, icon: Activity, label: 'On Time', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  { key: 'delayed' as const, icon: Clock, label: 'Delayed', bg: 'bg-rose-50', fg: 'text-rose-600' },
  { key: 'pending' as const, icon: AlertTriangle, label: 'Maintenance Pending', bg: 'bg-amber-50', fg: 'text-amber-600' },
]

export default function StatsCards({ stats }: { stats?: Stats }) {
  const s: Stats = stats || { total: 24, onTime: 18, delayed: 6, pending: 3 }
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map(({ key, icon: Icon, label, bg, fg }) => (
        <div
          key={label}
          className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className={`p-3 ${bg} rounded-xl`}>
            <Icon className={`w-6 h-6 ${fg}`} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{s[key]}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
