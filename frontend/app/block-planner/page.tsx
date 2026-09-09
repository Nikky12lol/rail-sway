'use client'
import { useEffect, useState } from 'react'
import MaintenanceTable from '@/components/MaintenanceTable'
import CandidateWindows, { Window } from '@/components/CandidateWindows'
import { api } from '@/lib/api'

export default function BlockPlanner() {
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [section, setSection] = useState('Bhadrak–Jajpur')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [windows, setWindows] = useState<Window[]>([])
  const [rec, setRec] = useState<any>(null)
  const [compat, setCompat] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.maintenance().then((d) => {
      setRows(d)
      setSelected(d.slice(0, 3).map((r: any) => r.task_id))
    })
  }, [])

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const find = async () => {
    if (!selected.length) { setError('Select at least one maintenance task.'); return }
    setLoading(true); setError('')
    try {
      const payload = { request_ids: selected, section, date: new Date(date).toISOString(), max_duration_hours: 2.5 }
      const plan = await api.fullPlan(payload)
      setWindows(plan.windows || [])
      setRec(plan.recommendation || null)
      setCompat(plan.compatibility || null)
    } catch (e: any) {
      setError(`Backend unreachable (${e.message}). Showing offline demo windows.`)
      // offline fallback so the demo never looks broken
      setWindows([
        { start: `${date}T08:00:00`, end: `${date}T10:30:00`, affected_trains: 6, priority_affected: 0, conflicts: 0, tsr_required: false, estimated_delay: 42, impact_score: 8.4 },
        { start: `${date}T11:00:00`, end: `${date}T13:30:00`, affected_trains: 11, priority_affected: 1, conflicts: 1, tsr_required: false, estimated_delay: 96, impact_score: 18.2 },
        { start: `${date}T14:00:00`, end: `${date}T16:30:00`, affected_trains: 14, priority_affected: 2, conflicts: 2, tsr_required: true, estimated_delay: 150, impact_score: 32.7 },
      ])
      setRec({ reason: 'Offline demo: 08:00 window affects only 6 trains with zero priority impact and no TSR.', confidence: 'MEDIUM' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Block Planner</h1>
      <p className="text-slate-500 mb-8">Select compatible maintenance tasks, then find the lowest-impact common block window.</p>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <label className="text-sm font-medium text-slate-700">Section
            <select value={section} onChange={(e) => setSection(e.target.value)} className="ml-2 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option>Bhadrak–Jajpur</option>
              <option>Jajpur–Keonjhar Road</option>
              <option>Bhadrak–Keonjhar Road</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-2 border border-slate-300 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </label>
          <button onClick={find} disabled={loading} className="ml-auto px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            {loading ? 'Analysing…' : 'Find Common Block Window'}
          </button>
        </div>
        <MaintenanceTable rows={rows} selected={selected} onToggle={toggle} />
      </div>

      {error && <p className="mb-5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{error}</p>}

      {compat && (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5 mb-6 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Compatibility: </span>{compat.summary}
          {compat.conflicts?.length > 0 && (
            <ul className="mt-2 list-disc ml-5 text-rose-600">
              {compat.conflicts.map((c: any, i: number) => <li key={i}>{c.pair?.join(' ↔ ')} — {c.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      {rec && (
        <div className="bg-primary-50/70 border border-primary-200 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-slate-800">AI Recommendation</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-600 text-white shadow-sm">{rec.confidence}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{rec.reason}</p>
        </div>
      )}

      <h2 className="font-semibold text-slate-800 mb-4">Candidate Windows</h2>
      <CandidateWindows windows={windows} />
    </div>
  )
}
