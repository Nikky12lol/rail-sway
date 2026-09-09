'use client'
import { useEffect, useState } from 'react'
import DecisionHistoryTable from '@/components/DecisionHistoryTable'
import { api } from '@/lib/api'

export default function DecisionsPage() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    api.decisions().then(setRows).catch(() => setRows([]))
  }, [])
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Decision History</h1>
      <p className="text-slate-500 mb-8">Audit trail of AI recommendations and controller actions.</p>
      <DecisionHistoryTable rows={rows} />
    </div>
  )
}
