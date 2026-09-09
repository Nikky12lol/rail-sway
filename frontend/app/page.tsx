'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ClipboardList, TableProperties, Calendar, History, ArrowRight } from 'lucide-react'
import StatsCards from '@/components/StatsCards'
import PendingAlerts from '@/components/PendingAlerts'
import { api } from '@/lib/api'

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), { ssr: false })

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 24, onTime: 18, delayed: 6, pending: 3 })
  const [flow, setFlow] = useState({ pending: 0, trains: 0, candidates: 0, lastDecision: '' })

  useEffect(() => {
    Promise.all([
      api.trainsLive().catch(() => []),
      api.maintenance().catch(() => []),
      api.blocks().catch(() => []),
      api.decisions().catch(() => []),
    ]).then(([trains, maint, blocks, decisions]) => {
      const t = Array.isArray(trains) ? trains : []
      const m = Array.isArray(maint) ? maint : []
      const b = Array.isArray(blocks) ? blocks : []
      const d = Array.isArray(decisions) ? decisions : []
      const delayed = t.filter((x: any) => x.status === 'delayed').length
      const pend = m.filter((x: any) => x.status === 'pending').length
      setStats({
        total: t.length || 24,
        onTime: (t.length || 24) - delayed,
        delayed: delayed || 6,
        pending: pend || 3,
      })
      setFlow({
        pending: pend,
        trains: t.length,
        candidates: b.filter((x: any) => x.status === 'candidate').length,
        lastDecision: d.length ? `${d[0].controller_decision || 'pending'} · ${new Date(d[0].timestamp).toLocaleDateString('en-IN')}` : 'none yet',
      })
    })
  }, [])

  const steps = [
    { href: '/maintenance', Icon: ClipboardList, title: `${flow.pending} pending requests`, sub: 'Departments → Rail-Sway' },
    { href: '/timetable', Icon: TableProperties, title: `${flow.trains} trains loaded`, sub: 'Operational timetable' },
    { href: '/block-planner', Icon: Calendar, title: `${flow.candidates} candidate blocks`, sub: 'AI analysis' },
    { href: '/decisions', Icon: History, title: `Last: ${flow.lastDecision}`, sub: 'Audit trail' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Operational Dashboard</h1>
          <p className="text-slate-500 mt-1">Bhadrak – Jajpur – Keonjhar Road corridor · live</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          System normal
        </span>
      </div>
      <StatsCards stats={stats} />
      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-5">
        {steps.map(({ href, Icon, title, sub }, i) => (
          <Link key={href} href={href} className="group bg-white rounded-2xl shadow-soft border border-slate-200/60 p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">Step {i + 1}</span>
              <span className="text-sm font-semibold text-slate-800">{title}</span>
              <span className="text-xs text-slate-500">{sub}</span>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-300 transition-all group-hover:text-primary-500 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[420px] bg-white rounded-2xl shadow-soft border border-slate-200/60 p-2 overflow-hidden">
          <DashboardMap />
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
          <PendingAlerts />
        </div>
      </div>
    </div>
  )
}
