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
      <h1 className="text-2xl font-semibold mb-1">Decision History</h1>
      <p className="text-sm text-gray-500 mb-6">Audit trail of AI recommendations and controller actions.</p>
      <DecisionHistoryTable rows={rows} />
    </div>
  )
}
