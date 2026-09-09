'use client'
import Link from 'next/link'

export type Window = {
  id?: number
  start: string
  end: string
  affected_trains: number
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

export default function CandidateWindows({ windows, recommendedId }: { windows: Window[]; recommendedId?: number | null }) {
  if (!windows.length) return <p className="text-sm text-gray-400">No candidate windows yet. Select tasks and click “Find Common Block Window”.</p>
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {windows.map((w, i) => {
        const isRec = recommendedId != null ? w.id === recommendedId : i === 0
        return (
          <div key={w.id ?? i} className={`rounded-xl border p-4 ${isRec ? 'border-teal-500 bg-teal-50/50 shadow' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Option {String.fromCharCode(65 + i)}</span>
              {isRec && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-600 text-white">RECOMMENDED</span>}
            </div>
            <div className="text-2xl font-bold">{fmt(w.start)} – {fmt(w.end)}</div>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between"><dt>Affected trains</dt><dd className="font-medium text-gray-900">{w.affected_trains}</dd></div>
              <div className="flex justify-between"><dt>Priority affected</dt><dd className="font-medium text-gray-900">{w.priority_affected}</dd></div>
              <div className="flex justify-between"><dt>Conflicts</dt><dd className="font-medium text-gray-900">{w.conflicts}</dd></div>
              <div className="flex justify-between"><dt>TSR</dt><dd className="font-medium text-gray-900">{w.tsr_required ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt>Est. delay</dt><dd className="font-medium text-gray-900">{w.estimated_delay} min</dd></div>
              <div className="flex justify-between"><dt>Impact score</dt><dd className="font-bold text-teal-700">{w.impact_score}</dd></div>
            </dl>
            {w.id && (
              <Link href={`/impact-analysis/${w.id}`} className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline">
                View impact analysis →
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
