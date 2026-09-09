'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import MaintenanceTable from '@/components/MaintenanceTable'
import CandidateWindows, { Window } from '@/components/CandidateWindows'
import AnalysisStepper from '@/components/AnalysisStepper'
import OverlapTimeline, { OverlapTrain } from '@/components/OverlapTimeline'
import OptimizedPlanCard from '@/components/OptimizedPlanCard'
import MetricStrip from '@/components/MetricStrip'
import StatusBadge, { sourceTone, sourceLabel } from '@/components/StatusBadge'
import { api } from '@/lib/api'

function StepHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="font-mono text-xs font-bold text-primary-300">STEP {n}</span>
      <h2 className="panel-title text-sm">{title}</h2>
      <span className="text-xs text-slate-500">{sub}</span>
    </div>
  )
}

export default function AIPlanner() {
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [section, setSection] = useState('Bhadrak–Jajpur')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [trains, setTrains] = useState<any[]>([])
  const [windows, setWindows] = useState<Window[]>([])
  const [rec, setRec] = useState<any>(null)
  const [compat, setCompat] = useState<any>(null)
  const [baseline, setBaseline] = useState<any>(null)
  const [savings, setSavings] = useState<any>(null)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [decisionMsg, setDecisionMsg] = useState('')
  const [decided, setDecided] = useState<{ id: number; decision: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)
  const candidatesRef = useRef<HTMLDivElement>(null)

  const loadInputs = async (sec = section, d = date) => {
    const [m, t] = await Promise.all([
      api.maintenance().catch(() => []),
      api.trainsLive(sec, d).catch(() => []),
    ])
    setRows(m)
    setSelected((s) => {
      if (s.length) return s.filter((id) => m.some((r: any) => r.task_id === id))
      try {
        const stored = JSON.parse(localStorage.getItem('railsway:selected') || '[]')
        const valid = stored.filter((id: string) => m.some((r: any) => r.task_id === id))
        if (valid.length) return valid
      } catch { /* ignore */ }
      return m.slice(0, 3).map((r: any) => r.task_id)
    })
    setTrains(Array.isArray(t) ? t : [])
  }

  useEffect(() => {
    loadInputs()
    return () => { if (timer.current) clearInterval(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
      try { localStorage.setItem('railsway:selected', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })

  const run = async () => {
    if (!selected.length) { setError('Select at least one maintenance request.'); return }
    if (timer.current) clearInterval(timer.current)
    setPhase('running'); setStep(0); setError(''); setDecisionMsg(''); setDecided(null)
    setRec(null); setCompat(null); setWindows([]); setBaseline(null); setSavings(null)
    // Stepper follows the real request: advances while in flight, completes on arrival.
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, 5)), 500)
    try {
      // Send the operating day as timezone-naive local wall time (YYYY-MM-DDTHH:mm:ss):
      // the timetable stores naive wall-clock times, and Date.toISOString()
      // would shift the day to UTC and break the analysis for +HH timezones.
      const payload = { request_ids: selected, section, date: `${date}T00:00:00`, max_duration_hours: 2.5 }
      const plan = await api.fullPlan(payload)
      if (timer.current) clearInterval(timer.current)
      setWindows(plan.windows || [])
      setRec(plan.recommendation || null)
      setCompat(plan.compatibility || null)
      setBaseline(plan.baseline || null)
      setSavings(plan.savings || null)
      setStep(6)
      setPhase('done')
    } catch (e: any) {
      if (timer.current) clearInterval(timer.current)
      setPhase('idle')
      setError(`AI analysis could not be completed: ${e.message}`)
    }
  }

  const bestStart = rec?.recommendation?.start
  const best = windows.find((w) => w.start === bestStart) || windows[0]
  const srcMix = [...new Set(trains.map((t) => t.source || 'seed'))]

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

  const overlapWindows = [
    ...windows.map((w) => ({ start: w.start, end: w.end, recommended: w.start === best?.start })),
    ...(baseline ? [{ start: baseline.start, end: baseline.end, baseline: true as const }] : []),
  ]

  const decide = async (decision: string) => {
    if (!best?.id) { setDecisionMsg('No persisted block to decide on.'); return }
    if (decided?.id === best.id) { setDecisionMsg(`Already ${decided.decision} — duplicate decisions are not recorded.`); return }
    setBusy(true); setDecisionMsg('')
    try {
      const updated = await api.decide(best.id, decision)
      setDecided({ id: best.id, decision: updated.status || decision })
      setDecisionMsg(`Block ${updated.status || decision} — advisory record logged. This panel does not execute railway operations.`)
    } catch (e: any) {
      setDecisionMsg(/409|already/i.test(e.message || '') ? `Already decided: ${e.message}` : `Decision failed (${e.message}).`)
    } finally {
      setBusy(false)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending').length
  const clubs = compat?.clubs?.length ?? 0
  const conflicts = compat?.conflicts?.length ?? 0

  return (
    <div>
      <div className="section-label mb-1">Core · AI-assisted decision support</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-1">AI Block Planner</h1>
      <p className="text-sm text-slate-400 mb-5">
        Selected: <span className="text-slate-200 font-medium">{section}</span> · <span className="text-slate-200 font-medium">{date}</span> · <span className="text-slate-200 font-medium">{selected.length} request(s)</span> · timetable:{' '}
        {srcMix.map((s) => sourceLabel(s)).join(', ') || '—'}
      </p>

      {/* STEP 01 */}
      <div className="panel-pad mb-4">
        <StepHead n="01" title="Request input" sub={`${pending} pending · ${selected.length} selected`} />
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <label className="text-xs text-slate-400">Section
            <select value={section} onChange={(e) => { setSection(e.target.value); setPhase('idle'); loadInputs(e.target.value, date) }} className="input ml-2 !py-1.5">
              <option>Bhadrak–Jajpur</option>
              <option>Jajpur–Keonjhar Road</option>
              <option>Bhadrak–Keonjhar Road</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">Date
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPhase('idle'); loadInputs(section, e.target.value) }} className="input ml-2 !py-1.5" />
          </label>
          <span className="text-xs text-slate-500">Analysis, timetable and candidates all use this date.</span>
          <Link href="/maintenance" className="link ml-auto">Manage requests →</Link>
        </div>
        <MaintenanceTable rows={rows} selected={selected} onToggle={toggle} />
        <div className="mt-4">
          <button onClick={run} disabled={phase === 'running'} className="btn-primary">
            {phase === 'running' ? 'Analyzing…' : 'Run AI block analysis'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-4 py-2.5">{error}</p>}
      {phase === 'running' && <div className="mb-4"><AnalysisStepper active={step} /></div>}

      {phase === 'done' && (
        <>
          {/* STEP 02 */}
          <div className="panel-pad mb-4">
            <StepHead n="02" title="Compatibility analysis" sub="backend grouping result" />
            {compat ? (
              <>
                <div className="mb-3"><MetricStrip items={[
                  { label: 'Block clubs', value: clubs },
                  { label: 'Conflicts', value: conflicts },
                  { label: 'Departments', value: [...new Set(overlapRequests.map((r) => r.department))].length },
                  { label: 'Grouped', value: selected.length },
                ]} /></div>
                <p className="text-sm text-slate-300">{compat.summary}</p>
                {conflicts > 0 && (
                  <ul className="mt-2 text-sm text-rose-300 space-y-1">
                    {compat.conflicts.map((c: any, i: number) => <li key={i}>{c.pair?.join(' ↔ ')} — {c.reason}</li>)}
                  </ul>
                )}
              </>
            ) : <p className="text-sm text-slate-500">No compatibility result.</p>}
          </div>

          {/* STEP 03 */}
          <div className="panel-pad mb-4" ref={candidatesRef} id="candidates">
            <StepHead n="03" title="Block window search" sub={`${windows.length} evaluated windows`} />
            <CandidateWindows windows={windows} recommendedId={best?.id} requestIds={selected} />
          </div>

          {/* STEP 04 */}
          <div className="panel-pad mb-4">
            <StepHead n="04" title="Train overlap" sub="scheduled timetable vs candidates" />
            <OverlapTimeline trains={overlapTrains} requests={overlapRequests} windows={overlapWindows} />
          </div>

          {/* STEP 05 */}
          <div className="panel-pad mb-4">
            <StepHead n="05" title="Impact simulation" sub={best ? `window ${best.start.slice(11, 16)}–${best.end.slice(11, 16)}` : ''} />
            {best ? (
              <MetricStrip items={[
                { label: 'Affected trains', value: best.affected_trains },
                { label: 'Immediate delay', value: `${best.immediate_delay ?? '—'}${best.immediate_delay !== undefined ? ' min' : ''}` },
                { label: 'Downstream delay', value: `${best.downstream_delay ?? '—'}${best.downstream_delay !== undefined ? ' min' : ''}` },
                { label: 'Total est. delay', value: `${best.estimated_delay} min` },
                { label: 'Priority trains', value: best.priority_affected },
                { label: 'Conflicts', value: best.conflicts },
                { label: 'TSR', value: best.tsr_required ? 'Yes' : 'No' },
              ]} />
            ) : <p className="text-sm text-slate-500">No candidate to simulate.</p>}
            <p className="mt-2 text-[11px] text-slate-600">Immediate = trains scheduled inside the block; downstream = simulated cascade knock-ons within 2h. Both are simulated estimates, not measured delays.</p>
          </div>

          {/* STEP 06 */}
          {best && rec && (
            <div className="mb-2">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-xs font-bold text-primary-300">STEP 06</span>
                <h2 className="panel-title text-sm">Recommendation</h2>
              </div>
              <OptimizedPlanCard
                blockId={best.id}
                section={section}
                start={best.start}
                end={best.end}
                requestIds={selected}
                departments={[...new Set(overlapRequests.map((r) => r.department))]}
                stats={{ requests: selected.length, affected: best.affected_trains, priority: best.priority_affected, delay: best.estimated_delay, immediate: best.immediate_delay, downstream: best.downstream_delay, score: best.impact_score }}
                confidence={rec.confidence}
                reason={rec.reason}
                onApprove={() => decide('approved')}
                onChooseAlternative={() => candidatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                onReject={() => decide('rejected')}
                busy={busy}
                decided={decided && decided.id === best.id ? decided.decision : null}
                savings={savings}
              />
              {decisionMsg && (
                <p className="mt-3 text-sm text-slate-300">{decisionMsg} <Link href="/decisions" className="link">View in Decisions →</Link></p>
              )}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                <span>Source:</span>
                {srcMix.map((s) => <StatusBadge key={s} tone={sourceTone(s)}>{sourceLabel(s)}</StatusBadge>)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
