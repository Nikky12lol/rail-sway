'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import MetricStrip from '@/components/MetricStrip'
import Pipeline from '@/components/Pipeline'
import StatusBadge, { deptTone, sourceTone, sourceLabel } from '@/components/StatusBadge'
import { api } from '@/lib/api'

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), { ssr: false })

function fmtT(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Overview() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [maint, setMaint] = useState<any[]>([])
  const [trains, setTrains] = useState<any[]>([])
  const [blocks, setBlocks] = useState<any[]>([])
  const [decisions, setDecisions] = useState<any[]>([])
  const [planBusy, setPlanBusy] = useState(false)
  const [planMsg, setPlanMsg] = useState('')

  const load = async (d = day) => {
    const [m, t, b, dec] = await Promise.all([
      api.maintenance().catch(() => []),
      api.trainsLive('Bhadrak–Jajpur', d).catch(() => []),
      api.blocks().catch(() => []),
      api.decisions().catch(() => []),
    ])
    setMaint(Array.isArray(m) ? m : [])
    setTrains(Array.isArray(t) ? t : [])
    setBlocks(Array.isArray(b) ? b : [])
    setDecisions(Array.isArray(dec) ? dec : [])
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = maint.filter((r) => r.status === 'pending')
  const critical = maint.filter((r) => r.urgency === 'critical' && r.status === 'pending')
  const candidates = blocks.filter((b) => b.status === 'candidate')
  const approved = blocks.filter((b) => b.status === 'approved')
  const byDept = [...new Set(maint.map((r) => r.department))]
  const srcMix = [...new Set(trains.map((t) => t.source || 'seed'))]

  // Latest approved plan carrying a stored occupation comparison
  let latestSaving: { window: string; hours: number } | null = null
  for (const d of decisions) {
    if (d.controller_decision !== 'approved' || !d.comparison) continue
    try {
      const occ = JSON.parse(d.comparison)?.savings?.occupation
      if (!occ) continue
      const cands = JSON.parse(d.candidates || '[]')
      const w = Array.isArray(cands) && cands[0] ? cands[0] : null
      latestSaving = {
        window: w ? `${fmtT(w.start)}–${fmtT(w.end)}` : '',
        hours: occ.hours_saved,
      }
      break
    } catch { /* keep looking */ }
  }

  const current = candidates.slice().sort((a, b) => a.impact_score - b.impact_score)[0]
  const reached =
    decisions.some((d) => d.controller_decision === 'approved' || d.controller_decision === 'rejected') ? 6
    : decisions.length ? 5
    : blocks.length ? 3
    : trains.length ? 1
    : maint.length ? 0 : -1

  const approveCurrent = async () => {
    if (!current) return
    setPlanBusy(true); setPlanMsg('')
    try {
      await api.decide(current.id, 'approved')
      setPlanMsg(`Block #${current.id} approved — advisory record logged.`)
      load()
    } catch (e: any) {
      setPlanMsg(/409|already/i.test(e.message || '') ? `Already decided: ${e.message}` : `Approval failed (${e.message}).`)
    } finally {
      setPlanBusy(false)
    }
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div>
          <div className="section-label mb-1">Rail-Sway · AI-assisted decision support</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">AI Maintenance Block Optimizer</h1>
          <p className="text-sm text-slate-400 mt-0.5">Bhadrak – Jajpur – Keonjhar Road</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Date
            <input type="date" value={day} onChange={(e) => { setDay(e.target.value); load(e.target.value) }} className="input ml-2 !py-1.5" />
          </label>
          <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> System normal
          </span>
        </div>
      </div>

      <MetricStrip items={[
        { label: 'Pending requests', value: pending.length, sub: `${byDept.length} dept(s)` },
        { label: 'Critical', value: critical.length, sub: critical.length ? 'needs attention' : 'none open' },
        { label: 'Candidate windows', value: candidates.length, sub: 'evaluated' },
        { label: 'Optimized blocks', value: approved.length, sub: 'approved' },
        { label: 'Time saved', value: latestSaving ? `${latestSaving.hours} hrs` : '—', sub: latestSaving ? `latest plan ${latestSaving.window}` : 'no approved plan yet', accent: !!latestSaving },
      ]} />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel-pad !p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="panel-title text-sm">Maintenance requests</h2>
            <Link href="/maintenance" className="link">Open requests →</Link>
          </div>
          {byDept.length === 0 && <p className="text-sm text-slate-500">No requests loaded.</p>}
          <div className="space-y-2">
            {byDept.map((d) => {
              const rs = maint.filter((r) => r.department === d)
              return (
                <div key={d} className="flex items-center gap-3 text-sm">
                  <StatusBadge tone={deptTone(d)}>{d}</StatusBadge>
                  <span className="text-slate-300">{rs.length} request(s)</span>
                  <span className="text-slate-500 text-xs truncate">{rs.slice(0, 3).map((r) => r.task_id).join(', ')}{rs.length > 3 ? ` +${rs.length - 3}` : ''}</span>
                  <span className="ml-auto text-xs text-slate-500 tabular-nums">{rs.filter((r) => r.status === 'pending').length} pending</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="panel-pad !p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="panel-title text-sm">Timetable · {trains.length} trains</h2>
            <Link href="/timetable" className="link">Open timetable →</Link>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {srcMix.map((s) => <StatusBadge key={s} tone={sourceTone(s)}>{sourceLabel(s)}</StatusBadge>)}
          </div>
          <div className="text-sm text-slate-400">
            {trains.filter((t) => (t.priority || 3) <= 2).length} priority movement(s) in view · {trains.filter((t) => t.status === 'delayed').length} delayed
          </div>
          <div className="mt-3 h-40 rounded-lg overflow-hidden border border-white/10">
            <DashboardMap />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">Corridor sketch from scheduled positions — not live GPS.</p>
        </div>
      </div>

      {/* current AI plan */}
      <div className="panel mt-4 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="panel-title text-sm">Current AI plan</h2>
          <Link href="/block-planner" className="link">Open AI Planner →</Link>
        </div>
        {current ? (
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="section-label">AI recommended block</div>
              <div className="text-xl font-bold text-slate-100 tabular-nums">{fmtT(current.start_time)} – {fmtT(current.end_time)}</div>
              <div className="text-xs text-slate-500">{current.section}</div>
            </div>
            <div className="text-sm text-slate-300">
              {current.affected_trains} train(s) affected · {current.priority_trains_affected} priority · {current.estimated_delay} min est. delay · score {current.impact_score}
            </div>
            <div className="ml-auto flex gap-2.5">
              <Link href={`/impact-analysis/${current.id}`} className="btn-ghost !py-2 flex items-center gap-2">View analysis <ArrowRight className="w-4 h-4" /></Link>
              <button onClick={approveCurrent} disabled={planBusy} className="btn-primary !py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {planBusy ? 'Recording…' : 'Approve plan'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No candidate block yet. <Link href="/block-planner" className="link">Run the AI analysis</Link> to generate one.</p>
        )}
        {planMsg && <p className="mt-2 text-sm text-slate-300">{planMsg} <Link href="/decisions" className="link">View history →</Link></p>}
      </div>

      <div className="mt-4">
        <Pipeline reached={reached} />
      </div>
    </div>
  )
}
