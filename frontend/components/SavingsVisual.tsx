'use client'

export type Savings = {
  baseline_start?: string
  baseline_end?: string
  estimated_delay_before: number
  estimated_delay_after: number
  estimated_minutes_saved: number
  impact_score_before?: number
  impact_score_after?: number
  estimated_impact_reduction_percent: number | null
  affected_trains_before?: number
  affected_trains_after?: number
  priority_trains_before?: number
  priority_trains_after?: number
  occupation?: {
    separate_hours: number
    coordinated_hours: number
    hours_saved: number
    percent: number | null
    request_count: number
  }
  explanation?: string
}

function fmtT(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function SavingsVisual({ savings }: { savings: Savings }) {
  const before = savings.estimated_delay_before
  const after = savings.estimated_delay_after
  const saved = savings.estimated_minutes_saved
  const pct = savings.estimated_impact_reduction_percent
  const max = Math.max(before, after, 1)
  const afterW = before > 0 ? Math.max(4, (after / max) * 100) : 100
  const occ = savings.occupation

  return (
    <div>
      <div className="section-label mb-3">Estimated operational saving · compared with baseline</div>
      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Before AI · baseline {fmtT(savings.baseline_start)}–{fmtT(savings.baseline_end)}</span>
            <span className="font-semibold text-slate-200 tabular-nums">{before.toFixed(0)} min estimated impact</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-slate-500" style={{ width: `${(before / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">After AI · recommended block</span>
            <span className="font-semibold text-slate-200 tabular-nums">{after.toFixed(0)} min estimated impact</span>
          </div>
          <div className="h-2.5 rounded-full bg-primary-500/20 overflow-hidden">
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${afterW}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {saved >= 0 ? (
          <span className="text-lg font-bold text-emerald-300 tabular-nums">↓ {saved.toFixed(0)} min estimated time saved</span>
        ) : (
          <span className="text-lg font-bold text-amber-300 tabular-nums">↑ {Math.abs(saved).toFixed(0)} min estimated delay traded for lower impact</span>
        )}
        {pct !== null && pct !== undefined && (
          <span className="text-sm font-semibold text-primary-300">{pct}% lower estimated impact</span>
        )}
      </div>
      {occ && (
        <p className="mt-2 text-xs text-slate-400">
          Corridor occupation: {occ.separate_hours}h separate → {occ.coordinated_hours}h coordinated
          {occ.hours_saved >= 0 ? (
            <> · <span className="font-semibold text-emerald-300">{occ.hours_saved}h saved{occ.percent !== null ? ` (${occ.percent}%)` : ''}</span></>
          ) : (
            <> · <span className="font-semibold text-amber-300">{Math.abs(occ.hours_saved)}h additional occupation</span></>
          )}
        </p>
      )}
      {savings.explanation && <p className="mt-2 text-xs text-slate-500 leading-relaxed">{savings.explanation}</p>}
      <p className="mt-1.5 text-[11px] text-slate-600">Baseline: earliest morning slot booked without optimization · Based on timetable simulation, not measured operations.</p>
    </div>
  )
}
