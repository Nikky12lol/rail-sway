'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Row = {
  id: number
  timestamp: string
  tasks: string
  candidates: string
  recommended: string
  reason: string
  controller_decision: string
  status: string
}

function parseCandidates(raw: string): { section: string; start: string; end: string; impact_score?: number; affected_trains?: number }[] {
  try {
    const v = JSON.parse(raw || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function fmtRange(start: string, end: string) {
  try {
    const a = new Date(start)
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
    const day = a.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    return `${day} · ${a.toLocaleTimeString('en-IN', opts)}–${new Date(end).toLocaleTimeString('en-IN', opts)}`
  } catch {
    return `${start} → ${end}`
  }
}

const decisionBadge = (d: string) =>
  d === 'approved' ? 'bg-emerald-100 text-emerald-700'
  : d === 'rejected' ? 'bg-rose-100 text-rose-700'
  : 'bg-amber-100 text-amber-700'

export default function DecisionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.decisions().then((d) => setRows(d)).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Decision History</h1>
      <p className="text-slate-500 mb-8">Every AI recommendation and controller action — the system audit trail.</p>
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50/80">
                {['ID', 'Block / window', 'Section', 'Impact', 'AI recommendation', 'Controller', 'Timestamp', 'Status'].map((h) => (
                  <th key={h} className="py-3.5 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cands = parseCandidates(r.candidates)
                const first = cands[0]
                const tasks: string[] = (() => { try { const v = JSON.parse(r.tasks || '[]'); return Array.isArray(v) ? v : [r.tasks] } catch { return [r.tasks] } })()
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-primary-50/50">
                    <td className="py-3.5 px-4 font-mono text-slate-500">#{r.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {first ? fmtRange(first.start, first.end) : (r.recommended || '—')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{first?.section || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {first?.impact_score !== undefined ? `score ${first.impact_score} · ${first.affected_trains ?? '?'} trains` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={r.reason || tasks.join(', ')}>
                      {r.reason || tasks.join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${decisionBadge(r.controller_decision)}`}>
                        {r.controller_decision || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{new Date(r.timestamp).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-slate-600">{r.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-8 text-center text-slate-400">Loading audit trail…</p>}
        {!loading && rows.length === 0 && <p className="py-8 text-center text-slate-400">No decisions logged yet — run an analysis and approve a block.</p>}
      </div>
    </div>
  )
}
