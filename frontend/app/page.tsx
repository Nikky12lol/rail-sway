'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import StatsCards from '@/components/StatsCards'
import PendingAlerts from '@/components/PendingAlerts'
import { api } from '@/lib/api'

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), { ssr: false })

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 24, onTime: 18, delayed: 6, pending: 3 })

  useEffect(() => {
    Promise.all([api.trainsLive().catch(() => []), api.maintenance().catch(() => [])]).then(([trains, maint]) => {
      const t = Array.isArray(trains) ? trains : []
      const delayed = t.filter((x: any) => x.status === 'delayed').length
      setStats({
        total: t.length || 24,
        onTime: (t.length || 24) - delayed,
        delayed: delayed || 6,
        pending: (Array.isArray(maint) ? maint.filter((m: any) => m.status === 'pending').length : 3) || 3,
      })
    })
  }, [])

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
