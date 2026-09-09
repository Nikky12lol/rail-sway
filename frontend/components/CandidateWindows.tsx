'use client'
import Link from 'next/link'

export type Window = {
  id?: number
  start: string
  end: string
  affected_trains: number
  affected_train_ids?: string[]
  priority_affected: number
  conflicts: number
  tsr_required: boolean
  estimated_delay: number
  immediate_delay?: number
  downstream_delay?: number
  impact_score: number
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
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

/** Ranked candidate comparison — backend order is the ranking. */
export default function CandidateWindows({ windows, recommendedId, requestIds }: { windows: Window[]; recommendedId?: number | null; requestIds?: string[] }) {
  if (!windows.length) return <p className="text-sm text-slate-500">No candidate windows yet. Select requests and run the AI analysis.</p>
  return (
    <div className="overflow-x-auto">
      <table className="tbl min-w-[980px]">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Window</th>
            <th>Requests</th>
            <th className="!text-right">Trains</th>
            <th className="!text-right">Est. delay</th>
            <th className="!text-right">Priority</th>
            <th className="!text-right">Conflicts</th>
            <th>TSR</th>
            <th className="!text-right">Impact</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {windows.map((w, i) => {
            const isRec = recommendedId != null ? w.id === recommendedId : i === 0
            return (
              <tr key={w.id ?? i} className={isRec ? '!bg-primary-500/[0.08] hover:!bg-primary-500/[0.12]' : ''}>
                <td className="font-bold text-slate-300 tabular-nums">#{i + 1}</td>
                <td className="whitespace-nowrap">
                  <span className="font-semibold text-slate-100 tabular-nums">{fmt(w.start)} – {fmt(w.end)}</span>
                  <span className="block text-[11px] text-slate-500">{fmtDay(w.start)}</span>
                </td>
                <td className="text-slate-400 tabular-nums">{requestIds?.length ?? '—'}</td>
                <td className="!text-right text-slate-200 tabular-nums">{w.affected_trains}</td>
                <td className="!text-right text-slate-200 tabular-nums">{w.estimated_delay} min</td>
                <td className={`!text-right tabular-nums font-semibold ${w.priority_affected ? 'text-rose-300' : 'text-slate-400'}`}>{w.priority_affected}</td>
                <td className="!text-right text-slate-400 tabular-nums">{w.conflicts}</td>
                <td className="text-slate-400">{w.tsr_required ? 'Yes' : 'No'}</td>
                <td className="!text-right font-bold text-primary-300 tabular-nums">{w.impact_score}</td>
                <td>
                  {isRec
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/25">AI recommended</span>
                    : <span className="text-slate-600 text-xs">candidate</span>}
                </td>
                <td className="!text-right">
                  {w.id
                    ? <Link href={`/impact-analysis/${w.id}`} className="link whitespace-nowrap">Analyze →</Link>
                    : <span className="text-slate-600 text-xs">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Ranked by estimated impact, lowest first. “Lowest estimated impact among evaluated windows” — not a proven global optimum.</p>
    </div>
  )
}
