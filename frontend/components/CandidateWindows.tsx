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
  impact_score: number
}

function fmt(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
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

export default function CandidateWindows({ windows, recommendedId, requestIds }: { windows: Window[]; recommendedId?: number | null; requestIds?: string[] }) {
  if (!windows.length) return <p className="text-sm text-slate-400">No candidate windows yet. Select tasks and click “Run AI Block Analysis”.</p>
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {windows.map((w, i) => {
        const isRec = recommendedId != null ? w.id === recommendedId : i === 0
        return (
          <div
            key={w.id ?? i}
            className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              isRec
                ? 'border-primary-400 bg-primary-50/60 shadow-soft ring-1 ring-primary-200'
                : 'border-slate-200/70 bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">Option {String.fromCharCode(65 + i)}</span>
              {isRec && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary-600 text-white shadow-sm">LOWEST ESTIMATED IMPACT</span>}
            </div>
            <div className="text-sm font-medium text-slate-500">{fmtDay(w.start)}</div>
            <div className="text-2xl font-bold text-slate-900">{fmt(w.start)} – {fmt(w.end)}</div>
            <dl className="mt-4 space-y-1.5 text-sm text-slate-500">
              <div className="flex justify-between"><dt>Affected trains</dt><dd className="font-medium text-slate-800">{w.affected_trains}</dd></div>
              <div className="flex justify-between"><dt>Priority affected</dt><dd className="font-medium text-slate-800">{w.priority_affected}</dd></div>
              <div className="flex justify-between"><dt>Conflicts</dt><dd className="font-medium text-slate-800">{w.conflicts}</dd></div>
              <div className="flex justify-between"><dt>TSR</dt><dd className="font-medium text-slate-800">{w.tsr_required ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt>Est. delay</dt><dd className="font-medium text-slate-800">{w.estimated_delay} min</dd></div>
              <div className="flex justify-between"><dt>Impact score</dt><dd className="font-bold text-primary-700">{w.impact_score}</dd></div>
            </dl>
            {requestIds && requestIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {requestIds.map((id) => (
                  <span key={id} className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{id}</span>
                ))}
              </div>
            )}
            {w.id && (
              <Link href={`/impact-analysis/${w.id}`} className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                View impact analysis →
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
