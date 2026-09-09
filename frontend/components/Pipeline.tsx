'use client'
import { Check } from 'lucide-react'

export const PIPELINE_STAGES = ['Requests', 'Timetable', 'Analysis', 'Candidates', 'Overlap', 'Recommendation', 'Approval']

/** Decision-pipeline strip: which workflow stage the system has reached. */
export default function Pipeline({ reached }: { reached: number }) {
  // reached: index of last completed stage (0-based); -1 = none yet
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900 px-5 py-4">
      <div className="section-label mb-3">Decision pipeline</div>
      <ol className="flex items-center">
        {PIPELINE_STAGES.map((label, i) => {
          const done = i <= reached
          const current = i === reached + 1
          return (
            <li key={label} className={`flex items-center ${i < PIPELINE_STAGES.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  done ? 'bg-emerald-500 text-ink-950' : current ? 'bg-primary-500 text-white animate-pulse' : 'bg-white/10 text-slate-500'
                }`}>
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className={`text-xs font-medium hidden lg:block ${done ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={`h-px flex-1 mx-2 ${i < reached ? 'bg-emerald-500/60' : 'bg-white/10'}`} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
