'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import MetricStrip from '@/components/MetricStrip'
import ImpactTimeline from '@/components/ImpactTimeline'
import RecommendationPanel from '@/components/RecommendationPanel'
import OverlapTimeline from '@/components/OverlapTimeline'
import SavingsVisual from '@/components/SavingsVisual'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function parseComparison(raw?: string | null): { baseline?: any; savings?: any } | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v && v.savings ? v : null
  } catch {
    return null
  }
}

function candidatesOf(raw?: string | null): any[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export default function ImpactPage({ params }: { params: Promise<{ windowId: string }> }) {
  const { windowId } = use(params)
  const [block, setBlock] = useState<any>(null)
  const [siblings, setSiblings] = useState<any[]>([])
  const [trains, setTrains] = useState<any[]>([])
  const [comparison, setComparison] = useState<{ baseline?: any; savings?: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api.getBlock(windowId)
      .then(async (b) => {
        if (!b) { setMissing(true); return }
        setBlock(b)
        const [sib, live] = await Promise.all([
          api.blocksBySection(b.section),
          api.trainsLive(b.section).catch(() => []),
        ])
        setSiblings(Array.isArray(sib) && sib.length ? sib : [b])
        setTrains(Array.isArray(live) ? live : [])
        api.decisions().then((logs: any[]) => {
          const matches = (logs || []).filter((l) => candidatesOf(l.candidates).some((c: any) => c.id === b.id && c.start === b.start_time))
          const withComp = matches.map((l) => ({ log: l, comp: parseComparison(l.comparison) })).filter((x) => x.comp)
          const decided = withComp.find((x) => x.log.controller_decision === 'approved' || x.log.controller_decision === 'rejected')
          setComparison((decided || withComp[0])?.comp || null)
        }).catch(() => {})
      })
      .catch(() => setMissing(true))
  }, [windowId])

  const decide = async (decision: string) => {
    if (block?.controller_decision) {
      setMsg(`Already ${block.controller_decision} — duplicate decisions are not recorded.`)
      return
    }
    setBusy(true); setMsg('')
    try {
      const updated = await api.decide(Number(windowId), decision)
      setBlock(updated)
      setMsg(`Block ${decision} — advisory record logged. This panel does not execute railway operations.`)
    } catch (e: any) {
      setMsg(/409|already/i.test(e.message || '') ? `Already decided: ${e.message}` : `Decision failed (${e.message}).`)
      api.getBlock(windowId).then((b) => b && setBlock(b))
    } finally {
      setBusy(false)
    }
  }

  if (missing) {
    return (
      <div className="panel-pad">
        <h1 className="panel-title mb-1">Block not found</h1>
        <p className="panel-sub mb-4 text-sm">No block window exists with this ID. It may predate the current database.</p>
        <Link href="/block-planner" className="link">Run a new analysis in the AI Planner →</Link>
      </div>
    )
  }
  if (!block) return <p className="text-slate-500 text-sm">Loading impact analysis…</p>

  const inWin = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= new Date(block.start_time).getTime() && t <= new Date(block.end_time).getTime()
  }
  const insideTrains = trains.filter((t) => t.scheduled_time && inWin(t.scheduled_time))
  const groupedIds = (block.maintenance_ids || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  const occ = comparison?.savings?.occupation
  const chartData = (siblings.length ? siblings : [block]).map((b: any) => ({
    affected_trains: b.affected_trains, priority_affected: b.priority_trains_affected,
    estimated_delay: b.estimated_delay, impact_score: b.impact_score,
  }))

  return (
    <div>
      <div className="section-label mb-1">Impact · evidence for the decision</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-1">Block Impact Analysis</h1>
      <p className="text-sm text-slate-400 mb-5">
        {fmt(block.start_time)} – {fmt(block.end_time)} · {block.section} · {fmtDay(block.start_time)} ·{' '}
        <StatusBadge tone={block.status === 'approved' ? 'green' : block.status === 'rejected' ? 'red' : 'amber'}>{block.controller_decision || block.status}</StatusBadge>
      </p>

      <div className="mb-4">
        <MetricStrip items={[
          { label: 'Trains affected', value: block.affected_trains },
          { label: 'Immediate delay', value: `${block.immediate_delay ?? '—'}${block.immediate_delay !== undefined && block.immediate_delay !== null ? ' min' : ''}` },
          { label: 'Downstream delay', value: `${block.downstream_delay ?? '—'}${block.downstream_delay !== undefined && block.downstream_delay !== null ? ' min' : ''}` },
          { label: 'Total est. delay', value: `${block.estimated_delay} min` },
          { label: 'Time saved', value: occ ? `${occ.hours_saved} hrs` : '—', sub: occ ? 'occupation' : 'no comparison stored', accent: !!occ },
        ]} />
      </div>
      <p className="mb-4 text-[11px] text-slate-600">Immediate = trains scheduled inside the block; downstream = simulated cascade knock-ons within 2h. Simulated estimates, not measured delays.</p>

      <div className="panel-pad mb-4">
        <OverlapTimeline
          trains={trains.filter((t) => t.scheduled_time).map((t) => ({
            train_number: t.train_number, scheduled_time: t.scheduled_time, priority: t.priority,
            level: (block.affected_train_ids || []).includes?.(t.train_number)
              ? 'recommended'
              : inWin(t.scheduled_time) ? 'recommended' : 'clear' as const,
          }))}
          requests={[]}
          windows={[{ start: block.start_time, end: block.end_time, recommended: true, label: `Window #${block.id}` }]}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="panel-pad">
          <h3 className="panel-title text-sm mb-3">Combined activities ({groupedIds.length})</h3>
          {groupedIds.length ? (
            <div className="flex flex-wrap gap-1.5">
              {groupedIds.map((id: string) => (
                <span key={id} className="font-mono text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 text-slate-200 ring-1 ring-inset ring-white/10">{id}</span>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No linked requests recorded.</p>}
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Conflicts</span><span className="text-slate-200 tabular-nums">{block.conflicts}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Temporary speed restriction</span><span className="text-slate-200">{block.tsr_required ? 'Required' : 'Not required'}</span></div>
          </div>
        </div>
        <div className="panel-pad">
          <h3 className="panel-title text-sm mb-3">Trains scheduled inside ({insideTrains.length})</h3>
          {insideTrains.length ? (
            <ul className="space-y-1.5 max-h-40 overflow-auto text-sm">
              {insideTrains.slice(0, 14).map((t: any) => (
                <li key={t.train_number} className="flex justify-between text-slate-400">
                  <span className="font-mono text-slate-200">{t.train_number}</span>
                  <span className="tabular-nums">{fmt(t.scheduled_time)}{t.priority <= 2 ? <span className="ml-2 text-[11px] font-semibold text-rose-300">PRIORITY</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">None — this window threads between scheduled movements.</p>}
        </div>
      </div>

      {comparison?.savings ? (
        <div className="panel-pad mb-4">
          <h3 className="panel-title text-sm mb-4">Before vs after</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-4 text-sm">
            <div className="rounded-lg border border-white/10 p-4">
              <div className="section-label mb-2">Before AI · baseline</div>
              <div className="font-semibold text-slate-200 tabular-nums">{fmt(comparison.baseline?.start)} – {fmt(comparison.baseline?.end)}</div>
              <dl className="mt-2 space-y-1 text-slate-400">
                <div className="flex justify-between"><dt>Estimated impact</dt><dd className="font-semibold text-slate-200 tabular-nums">{comparison.savings.estimated_delay_before} min</dd></div>
                <div className="flex justify-between"><dt>Trains affected</dt><dd className="font-semibold text-slate-200 tabular-nums">{comparison.savings.affected_trains_before}</dd></div>
                <div className="flex justify-between"><dt>Priority trains</dt><dd className="font-semibold text-slate-200 tabular-nums">{comparison.savings.priority_trains_before}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.05] p-4">
              <div className="section-label mb-2 !text-emerald-300/80">After AI · recommended</div>
              <div className="font-semibold text-slate-100 tabular-nums">{fmt(block.start_time)} – {fmt(block.end_time)}</div>
              <dl className="mt-2 space-y-1 text-slate-400">
                <div className="flex justify-between"><dt>Estimated impact</dt><dd className="font-semibold text-slate-100 tabular-nums">{comparison.savings.estimated_delay_after} min</dd></div>
                <div className="flex justify-between"><dt>Trains affected</dt><dd className="font-semibold text-slate-100 tabular-nums">{comparison.savings.affected_trains_after}</dd></div>
                <div className="flex justify-between"><dt>Priority trains</dt><dd className="font-semibold text-slate-100 tabular-nums">{comparison.savings.priority_trains_after}</dd></div>
              </dl>
            </div>
          </div>
          <SavingsVisual savings={comparison.savings} />
        </div>
      ) : (
        <div className="panel-pad mb-4">
          <p className="text-sm text-slate-500">No stored before/after comparison for this window (it predates the comparison audit, or was created outside an analysis run).</p>
        </div>
      )}

      <div className="panel-pad mb-4">
        <h3 className="panel-title text-sm mb-3">Sibling candidates</h3>
        <ImpactTimeline windows={chartData} />
      </div>

      <RecommendationPanel
        reason={block.recommendation_reason || 'No backend explanation was stored for this window. Re-run the analysis from the AI Planner to generate one.'}
        confidence={block.priority_trains_affected === 0 ? 'HIGH' : 'MEDIUM'}
        onApprove={() => decide('approved')}
        onReject={() => decide('rejected')}
        busy={busy}
        decided={block.controller_decision}
      />
      {msg && <p className="mt-3 text-sm text-slate-300">{msg} <Link href="/decisions" className="link">View in Decisions →</Link></p>}
    </div>
  )
}
