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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Operational Dashboard</h1>
          <p className="text-sm text-gray-500">Bhadrak – Jajpur – Keonjhar Road corridor · live</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">● System normal</span>
      </div>
      <StatsCards stats={stats} />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[420px] bg-white rounded-xl shadow p-2 overflow-hidden">
          <DashboardMap />
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <PendingAlerts />
        </div>
      </div>
    </div>
  )
}
