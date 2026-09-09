'use client'
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react'

export type PlanStats = {
  requests: number
  affected: number
  priority: number
  delay: number
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
  section,
  start,
  end,
  requestIds,
  stats,
  confidence,
  reason,
  onApprove,
  onReject,
  busy,
  decided,
}: {
  section: string
  start: string
  end: string
  requestIds: string[]
  stats: PlanStats
  confidence: string
  reason: string
  onApprove: () => void
  onReject: () => void
  busy?: boolean
  decided?: string | null
}) {
  const metrics: [string, string | number][] = [
    ['Maintenance activities', stats.requests],
    ['Affected trains', stats.affected],
    ['Priority trains', stats.priority],
    ['Estimated delay', `${stats.delay} min`],
    ['Impact score', stats.score],
  ]
  return (
    <div className="rounded-2xl overflow-hidden shadow-soft border border-primary-200">
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 px-6 py-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-white" />
        <div>
          <div className="text-white font-bold tracking-tight">AI-Recommended Block</div>
          <div className="text-primary-100 text-xs">Lowest estimated operational impact among the evaluated candidate windows · {confidence} confidence</div>
        </div>
      </div>
      <div className="bg-white px-6 py-5">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Section</div>
            <div className="font-semibold text-slate-800">{section}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Date</div>
            <div className="font-semibold text-slate-800">{fmtDay(start)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Recommended window</div>
            <div className="text-2xl font-bold text-slate-900">{fmt(start)} – {fmt(end)}</div>
          </div>
        </div>
        {requestIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-xs text-slate-400 mr-1">Grouped requests:</span>
            {requestIds.map((id) => (
              <span key={id} className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100">{id}</span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {metrics.map(([k, v]) => (
            <div key={k} className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5">
              <div className="text-lg font-bold text-slate-800">{v}</div>
              <div className="text-xs text-slate-500">{k}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{reason}</p>
        {decided ? (
          <p className={`text-sm font-medium px-4 py-2.5 rounded-xl ${decided === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            Already {decided} — duplicate decisions are not recorded. Run a new analysis or review another candidate.
          </p>
        ) : (
        <div className="flex items-center gap-3">
          <button onClick={onApprove} disabled={busy} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            <CheckCircle2 className="w-4 h-4" /> Approve Block
          </button>
          <button onClick={onReject} disabled={busy} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            <XCircle className="w-4 h-4" /> Reject
          </button>
          <span className="ml-auto text-xs text-slate-400 hidden md:block">AI recommends — the controller decides</span>
        </div>
        )}
      </div>
    </div>
  )
}
