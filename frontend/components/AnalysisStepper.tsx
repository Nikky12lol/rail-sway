'use client'
import { Check, Loader2 } from 'lucide-react'

export const ANALYSIS_STEPS = [
  'Analyzing maintenance requests',
  'Finding compatible work',
  'Checking timetable conflicts',
  'Simulating train impact',
  'Ranking candidate windows',
  'Generating optimized block plan',
]

export default function AnalysisStepper({ active }: { active: number }) {
  // active: index of current step (0-based); ANALYSIS_STEPS.length = all done
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">AI Block Analysis</h3>
      <ol className="space-y-3">
        {ANALYSIS_STEPS.map((label, i) => {
          const done = active > i
          const current = active === i
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'bg-emerald-500 text-white' : current ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : current ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs font-semibold">{i + 1}</span>}
              </span>
              <span className={done || current ? 'font-medium text-slate-800' : 'text-slate-400'}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
