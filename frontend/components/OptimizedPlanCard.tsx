'use client'
import { CheckCircle2, XCircle, ListOrdered, PartyPopper } from 'lucide-react'
import SavingsVisual, { Savings } from './SavingsVisual'
import StatusBadge, { deptTone } from './StatusBadge'

export type PlanStats = {
  requests: number
  affected: number
  priority: number
  delay: number
  immediate?: number
  downstream?: number
  score: number
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function OptimizedPlanCard({
  blockId,
  section,
  start,
  end,
  requestIds,
  departments,
  stats,
  confidence,
  reason,
  onApprove,
  onChooseAlternative,
  onReject,
  busy,
  decided,
  savings,
}: {
  blockId?: number | null
  section: string
  start: string
  end: string
  requestIds: string[]
  departments: string[]
  stats: PlanStats
  confidence: string
  reason: string
  onApprove: () => void
  onChooseAlternative: () => void
  onReject: () => void
  busy?: boolean
  decided?: string | null
  savings?: Savings | null
}) {
  const occ = savings?.occupation
  return (
    <div className="rounded-xl overflow-hidden border border-emerald-400/25 bg-ink-900">
      <div className="px-5 py-4 border-b border-white/10 bg-emerald-500/[0.06] flex items-center gap-3 flex-wrap">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold">✓</span>
        <div>
          <div className="font-bold tracking-tight text-slate-100">AI-assisted block plan{blockId ? <span className="text-slate-500 font-mono text-sm"> · BLOCK #{blockId}</span> : null}</div>
          <div className="text-xs text-slate-400">{fmtDay(start)} · {fmt(start)} — {fmt(end)} · {section}</div>
        </div>
        <div className="ml-auto flex gap-1.5">
          {departments.map((d) => <StatusBadge key={d} tone={deptTone(d)}>{d} ✓</StatusBadge>)}
        </div>
      </div>

      <div className="px-5 py-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 p-4">
          <div className="section-label mb-2">Corridor occupation</div>
          {occ ? (
            <>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Before (separate blocks)</span><span className="font-semibold text-slate-200 tabular-nums">{occ.separate_hours} hrs</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-slate-400">After (coordinated)</span><span className="font-semibold text-slate-200 tabular-nums">{occ.coordinated_hours} hrs</span></div>
              <div className="mt-2 text-lg font-bold tabular-nums">
                {occ.hours_saved >= 0
                  ? <span className="text-emerald-300">Time saved: {occ.hours_saved} hrs{occ.percent !== null ? ` (${occ.percent}%)` : ''}</span>
                  : <span className="text-amber-300">Additional occupation: {Math.abs(occ.hours_saved)} hrs</span>}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">Occupation comparison unavailable for this plan.</p>
          )}
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="section-label mb-2">Train impact (simulated)</div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">Trains affected</span><span className="font-semibold text-slate-200 tabular-nums">{stats.affected}{stats.priority ? <span className="text-rose-300"> ({stats.priority} priority)</span> : ''}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-slate-400">Total estimated delay</span><span className="font-semibold text-slate-200 tabular-nums">{stats.delay} min</span></div>
          {(stats.immediate !== undefined || stats.downstream !== undefined) && (
            <div className="flex justify-between text-sm mt-1"><span className="text-slate-400">Immediate / downstream</span><span className="font-semibold text-slate-200 tabular-nums">{stats.immediate ?? '—'} / {stats.downstream ?? '—'} min</span></div>
          )}
          <div className="flex justify-between text-sm mt-1"><span className="text-slate-400">Impact score</span><span className="font-semibold text-primary-300 tabular-nums">{stats.score}</span></div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="section-label mb-1.5">Recommendation</div>
        <p className="text-sm text-slate-300 leading-relaxed">{reason}</p>
        <p className="mt-1 text-[11px] text-slate-500">Lowest estimated impact among evaluated windows · {confidence} confidence · AI recommends — the controller decides.</p>
        {savings && (
          <div className="mt-3 rounded-lg border border-white/10 p-4">
            <SavingsVisual savings={savings} />
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-white/10">
        {decided ? (
          <p className={`text-sm font-medium px-4 py-2.5 rounded-lg border flex items-center gap-2 ${decided === 'approved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-rose-500/10 text-rose-300 border-rose-400/20'}`}>
            {decided === 'approved' ? <PartyPopper className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {decided === 'approved'
              ? `Block approved — advisory record logged. ${requestIds.length} task(s) coordinated, ${stats.affected} train(s) affected, ${stats.delay} min estimated delay.`
              : 'Block rejected — advisory record logged.'}
            {' '}This panel does not execute railway operations.
          </p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <button onClick={onApprove} disabled={busy} className="btn-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {busy ? 'Recording…' : 'Approve plan'}
            </button>
            <button onClick={onChooseAlternative} disabled={busy} className="btn-ghost flex items-center gap-2">
              <ListOrdered className="w-4 h-4" /> Modify / choose alternative
            </button>
            <button onClick={onReject} disabled={busy} className="px-5 py-2.5 rounded-lg text-sm font-medium text-rose-300/90 transition-all hover:bg-rose-500/10 active:scale-[0.98] disabled:opacity-50">
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
