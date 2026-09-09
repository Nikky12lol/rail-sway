'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import MaintenanceForm from '@/components/MaintenanceForm'
import { api } from '@/lib/api'

const deptBadge = (d: string) =>
  d === 'ENG' ? 'bg-primary-100 text-primary-700'
  : d === 'SNT' ? 'bg-violet-100 text-violet-700'
  : d === 'TRD' ? 'bg-amber-100 text-amber-700'
  : 'bg-slate-100 text-slate-700'

const urgencyBadge = (u: string) =>
  u === 'critical' ? 'bg-rose-100 text-rose-700'
  : u === 'high' ? 'bg-amber-100 text-amber-700'
  : 'bg-emerald-100 text-emerald-700'

const statusBadge = (s: string) =>
  s === 'pending' ? 'bg-slate-100 text-slate-600'
  : s === 'scheduled' || s === 'approved' ? 'bg-emerald-100 text-emerald-700'
  : s === 'rejected' ? 'bg-rose-100 text-rose-700'
  : 'bg-slate-100 text-slate-600'

function reqDate(r: any) {
  return r.requested_date || (r.created_at ? r.created_at.slice(0, 10) : '—')
}

export default function MaintenancePage() {
  const [rows, setRows] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [day, setDay] = useState('') // '' = all dates

  const load = async (d = day) => {
    setLoading(true); setError('')
    try {
      setRows(await api.maintenance(d || undefined))
    } catch {
      setRows([])
      setError('Backend unreachable — showing cached demo data.')
      setRows(await api.maintenance(d || undefined).catch(() => []))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pending = rows.filter((r) => r.status === 'pending')
  const depts = [...new Set(rows.map((r) => r.department))]

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Maintenance Requests</h1>
          <p className="text-slate-500">Independent requests filed by departments — the first input to block planning.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Submit Maintenance Request
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {[
          ['Total requests', rows.length],
          ['Pending', pending.length],
          ['Departments', depts.length],
          ['Scheduled', rows.filter((r) => r.status === 'scheduled').length],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
            <div className="text-2xl font-bold text-slate-800">{v as number}</div>
            <div className="text-sm text-slate-500">{k as string}</div>
          </div>
        ))}
      </div>

      {showForm && <MaintenanceForm onCreated={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />}
      {error && <p className="mb-5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-slate-700">Requested date
          <input type="date" value={day} onChange={(e) => { setDay(e.target.value); load(e.target.value) }} className="ml-2 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </label>
        {day && (
          <button onClick={() => { setDay(''); load('') }} className="text-sm font-medium text-primary-600 hover:underline">Show all dates</button>
        )}
        <span className="ml-auto text-sm text-slate-500">{rows.length} request(s){day ? ` for ${day}` : ''}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50/80">
                {['Request ID', 'Dept', 'Work type', 'Section', 'Location', 'Req. date', 'Dur.', 'Priority', 'Status'].map((h) => (
                  <th key={h} className="py-3.5 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.task_id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-primary-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">{r.task_id}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${deptBadge(r.department)}`}>{r.department}</span></td>
                  <td className="py-3 px-4 text-slate-600">{r.work_type}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{r.section}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{r.location}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{reqDate(r)}</td>
                  <td className="py-3 px-4 text-slate-600">{r.duration}h</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${urgencyBadge(r.urgency)}`}>{r.urgency}</span></td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${statusBadge(r.status)}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && <p className="py-8 text-center text-slate-400">No requests yet — submit the first one above.</p>}
        {loading && <p className="py-8 text-center text-slate-400">Loading requests…</p>}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Next step: review the <Link href="/timetable" className="font-medium text-primary-600 hover:underline">railway timetable</Link>, then run analysis in the <Link href="/block-planner" className="font-medium text-primary-600 hover:underline">Block Planner</Link>.
      </p>
    </div>
  )
}
