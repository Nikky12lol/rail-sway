'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
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
  comparison?: string | null
}

function parseCandidates(raw: string): any[] {
  try {
    const v = JSON.parse(raw || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function parseComparison(raw?: string | null): any | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v?.savings ? v.savings : null
  } catch {
    return null
  }
}

function taskList(raw: string): string[] {
  try {
    const v = JSON.parse(raw || '[]')
    return Array.isArray(v) ? v : [raw]
  } catch {
    return [raw]
  }
}

function fmtRange(start: string, end: string) {
  try {
    const a = new Date(start)
    const day = a.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const t = (x: string) => new Date(x).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    return `${day} · ${t(start)}–${t(end)}`
  } catch {
    return `${start} → ${end}`
  }
}

const decisionTone = (d: string) => (d === 'approved' ? 'green' : d === 'rejected' ? 'red' : 'amber') as 'green' | 'red' | 'amber'

export default function DecisionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    api.decisions().then((d) => setRows(d)).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="section-label mb-1">Audit · every recommendation and ruling, traceable</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-1">Decisions</h1>
      <p className="text-sm text-slate-400 mb-5">Analysis generated → candidates evaluated → recommendation → controller decision.</p>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[1080px]">
            <thead>
              <tr><th>Date</th><th>Time</th><th>Requests</th><th>Window</th><th>Impact</th><th>Saved</th><th>Recommendation</th><th>Decision</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cands = parseCandidates(r.candidates)
                const first = cands[0]
                const sv = parseComparison(r.comparison)
                const tasks = taskList(r.tasks)
                const expanded = open === r.id
                return (
                  <>
                    <tr key={r.id} onClick={() => setOpen(expanded ? null : r.id)} className="cursor-pointer">
                      <td className="whitespace-nowrap text-slate-400 tabular-nums">{new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td className="whitespace-nowrap text-slate-400 tabular-nums">{new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="font-mono text-xs text-slate-300 whitespace-nowrap">{tasks.slice(0, 2).join(', ')}{tasks.length > 2 ? ` +${tasks.length - 2}` : ''}</td>
                      <td className="font-medium text-slate-200 whitespace-nowrap">{first ? fmtRange(first.start, first.end) : (r.recommended || '—')}</td>
                      <td className="text-slate-400 whitespace-nowrap tabular-nums">{first?.impact_score !== undefined ? `score ${first.impact_score}` : '—'}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {sv ? (
                          <span className={`font-semibold ${sv.estimated_minutes_saved >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {sv.estimated_minutes_saved >= 0 ? `↓ ${sv.estimated_minutes_saved}m` : `↑ ${Math.abs(sv.estimated_minutes_saved)}m`}
                          </span>
                        ) : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="text-slate-500 max-w-[220px] truncate" title={r.reason || tasks.join(', ')}>{r.reason || tasks.join(', ')}</td>
                      <td><StatusBadge tone={decisionTone(r.controller_decision)}>{r.controller_decision || '—'}</StatusBadge></td>
                      <td className="text-slate-500">{r.status}</td>
                    </tr>
                    {expanded && (
                      <tr key={r.id + '-detail'} className="!bg-white/[0.02]">
                        <td colSpan={9}>
                          <ol className="py-1 space-y-1.5 text-xs text-slate-400">
                            <li><span className="text-slate-500 font-mono mr-2">01</span>Analysis generated — {tasks.length} request(s): {tasks.join(', ') || '—'}</li>
                            <li><span className="text-slate-500 font-mono mr-2">02</span>{cands.length} candidate window(s) evaluated{cands.length ? `: ${cands.map((c: any) => `${c.start?.slice(11, 16)}–${c.end?.slice(11, 16)} (score ${c.impact_score ?? '?'})`).join(' · ')}` : ''}</li>
                            <li><span className="text-slate-500 font-mono mr-2">03</span>Recommendation generated{r.recommended ? ` — ${r.recommended.slice(11, 16)}` : ''}{sv ? ` · est. ${sv.estimated_minutes_saved} min saved vs baseline` : ''}</li>
                            <li><span className="text-slate-500 font-mono mr-2">04</span>Controller decision: <span className="font-semibold text-slate-200">{r.controller_decision || 'pending'}</span> · {new Date(r.timestamp).toLocaleString('en-IN')}</li>
                          </ol>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-6 text-center text-slate-500 text-sm">Loading audit trail…</p>}
        {!loading && rows.length === 0 && <p className="py-6 text-center text-slate-500 text-sm">No decisions logged yet — run an analysis and approve a block.</p>}
      </div>
      <p className="mt-2 text-[11px] text-slate-600">Click a row to expand the stage-by-stage trail. Saved minutes are estimated simulation values, not measured operations.</p>
    </div>
  )
}
