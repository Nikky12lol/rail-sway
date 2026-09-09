'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import MaintenanceTable from '@/components/MaintenanceTable'
import CandidateWindows, { Window } from '@/components/CandidateWindows'
import AnalysisStepper, { ANALYSIS_STEPS } from '@/components/AnalysisStepper'
import OverlapTimeline, { OverlapTrain } from '@/components/OverlapTimeline'
import OptimizedPlanCard from '@/components/OptimizedPlanCard'
import { api } from '@/lib/api'

export default function BlockPlanner() {
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [section, setSection] = useState('Bhadrak–Jajpur')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [trains, setTrains] = useState<any[]>([])
  const [windows, setWindows] = useState<Window[]>([])
  const [rec, setRec] = useState<any>(null)
  const [compat, setCompat] = useState<any>(null)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [decisionMsg, setDecisionMsg] = useState('')
  const [decided, setDecided] = useState<{ id: number; decision: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  const loadInputs = async (sec = section, d = date) => {
    const [m, t] = await Promise.all([
      api.maintenance().catch(() => []),
      api.trainsLive(sec, d).catch(() => []),
    ])
    setRows(m)
    setSelected((s) => (s.length ? s : m.slice(0, 3).map((r: any) => r.task_id)))
    setTrains(Array.isArray(t) ? t : [])
  }

  useEffect(() => {
    loadInputs()
    return () => { if (timer.current) clearInterval(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const run = async () => {
    if (!selected.length) { setError('Select at least one maintenance task.'); return }
    if (timer.current) clearInterval(timer.current)
    setPhase('running'); setStep(0); setError(''); setDecisionMsg(''); setDecided(null); setRec(null); setCompat(null); setWindows([])
    // Stepper animation follows real progress: it advances while the single
    // backend call is in flight and completes the moment results arrive.
    // No artificial minimum delay — a fast backend finishes fast.
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 500)
    try {
      const payload = { request_ids: selected, section, date: new Date(date).toISOString(), max_duration_hours: 2.5 }
      const plan = await api.fullPlan(payload)
      if (timer.current) clearInterval(timer.current)
      setWindows(plan.windows || [])
      setRec(plan.recommendation || null)
      setCompat(plan.compatibility || null)
      setStep(ANALYSIS_STEPS.length)
      setPhase('done')
    } catch (e: any) {
      if (timer.current) clearInterval(timer.current)
      setPhase('idle')
      setError(`Analysis failed: ${e.message}. Check that the backend is running.`)
    }
  }

  const bestStart = rec?.recommendation?.start
  const best = windows.find((w) => w.start === bestStart) || windows[0]

  // Overlap levels come from the backend's own affected_train_ids sets —
  // the same sets the impact scores were computed from — not re-derived.
  const idLevel = new Map<string, 'recommended' | 'candidate'>()
  for (const w of windows) {
    const lvl = w.start === best?.start ? 'recommended' : 'candidate'
    for (const id of w.affected_train_ids || []) {
      if (lvl === 'recommended' || !idLevel.has(id)) idLevel.set(id, lvl)
    }
  }
  const overlapTrains: OverlapTrain[] = trains
    .filter((t) => t.scheduled_time)
    .map((t) => ({
      train_number: t.train_number,
      train_name: t.train_name,
      scheduled_time: t.scheduled_time,
      priority: t.priority,
      level: idLevel.get(t.train_number) || 'clear',
    } as OverlapTrain))

  const overlapRequests = rows
    .filter((r) => selected.includes(r.task_id))
    .map((r) => ({ task_id: r.task_id, department: r.department, work_type: r.work_type, duration: r.duration }))

  const overlapWindows = windows.map((w) => ({ start: w.start, end: w.end, recommended: w.start === best?.start }))

  const decide = async (decision: string) => {
    if (!best?.id) { setDecisionMsg('No persisted block to decide on.'); return }
    if (decided?.id === best.id) { setDecisionMsg(`Already ${decided.decision} — duplicate decisions are not recorded.`); return }
    setBusy(true); setDecisionMsg('')
    try {
      const updated = await api.decide(best.id, decision)
      setDecided({ id: best.id, decision: updated.status || decision })
      setDecisionMsg(`Block ${updated.status || decision} and recorded in the audit trail.`)
    } catch (e: any) {
      setDecisionMsg(/409|already/i.test(e.message || '') ? `Already decided: ${e.message}` : `Decision failed (${e.message}).`)
    } finally {
      setBusy(false)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending').length

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Block Planner · AI Analysis</h1>
      <p className="text-slate-500 mb-8">Two inputs in, one estimated block out — reviewed by a human controller.</p>

      {/* TWO INPUTS */}
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 mb-1">Input 1</div>
          <div className="font-semibold text-slate-800">Maintenance Requests</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{pending} pending · {selected.length} selected</div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label className="text-sm text-slate-600">Section
              <select value={section} onChange={(e) => { setSection(e.target.value); setPhase('idle'); loadInputs(e.target.value, date) }} className="ml-2 border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Bhadrak–Jajpur</option>
                <option>Jajpur–Keonjhar Road</option>
                <option>Bhadrak–Keonjhar Road</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">Date
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPhase('idle'); loadInputs(section, e.target.value) }} className="ml-2 border border-slate-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
            <Link href="/maintenance" className="ml-auto text-sm font-medium text-primary-600 hover:underline">Manage →</Link>
          </div>
          <p className="mt-2 text-xs text-slate-400">Timetable below and analysis both use this date.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 mb-1">Input 2</div>
          <div className="font-semibold text-slate-800">Railway Timetable</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{trains.length} trains loaded</div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-slate-600">{section} · {date}</span>
            <Link href="/timetable" className="ml-auto text-sm font-medium text-primary-600 hover:underline">Manage →</Link>
          </div>
        </div>
      </div>

      {/* selection + run */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
        <MaintenanceTable rows={rows} selected={selected} onToggle={toggle} />
        <div className="mt-5 flex items-center gap-3">
          <button onClick={run} disabled={phase === 'running'} className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            {phase === 'running' ? 'Analyzing…' : 'Run AI Block Analysis'}
          </button>
          {phase === 'running' && <span className="text-sm text-slate-500">Compatibility → timetable overlap → impact simulation…</span>}
        </div>
      </div>

      {error && <p className="mb-5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}

      {phase === 'running' && (
        <div className="mb-6"><AnalysisStepper active={step} /></div>
      )}

      {phase === 'done' && (
        <>
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

          <div className="mb-6">
            <OverlapTimeline trains={overlapTrains} requests={overlapRequests} windows={overlapWindows} />
          </div>

          <h2 className="font-semibold text-slate-800 mb-4">Candidate Windows <span className="font-normal text-slate-400 text-sm">· ranked by estimated impact</span></h2>
          <div className="mb-6"><CandidateWindows windows={windows} recommendedId={best?.id} requestIds={selected} /></div>

          {best && rec && (
            <div className="mb-6">
              <OptimizedPlanCard
                section={section}
                start={best.start}
                end={best.end}
                requestIds={selected}
                stats={{ requests: selected.length, affected: best.affected_trains, priority: best.priority_affected, delay: best.estimated_delay, score: best.impact_score }}
                confidence={rec.confidence}
                reason={rec.reason}
                onApprove={() => decide('approved')}
                onReject={() => decide('rejected')}
                busy={busy}
                decided={decided && decided.id === best.id ? decided.decision : null}
              />
              {decisionMsg && (
                <p className="mt-3 text-sm text-slate-600">{decisionMsg} <Link href="/decisions" className="font-medium text-primary-600 hover:underline">View in Decision History →</Link></p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
