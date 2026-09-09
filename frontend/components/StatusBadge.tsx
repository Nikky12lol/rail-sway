'use client'

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet'

const tones: Record<Tone, string> = {
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
  red: 'bg-rose-500/15 text-rose-300 ring-rose-400/25',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
  blue: 'bg-primary-500/15 text-primary-300 ring-primary-400/25',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-400/25',
  slate: 'bg-white/5 text-slate-400 ring-white/10',
}

export default function StatusBadge({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  )
}

export const urgencyTone = (u: string): Tone =>
  u === 'critical' ? 'red' : u === 'high' ? 'amber' : u === 'low' ? 'slate' : 'green'

export const deptTone = (d: string): Tone =>
  d === 'ENG' ? 'blue' : d === 'SNT' ? 'violet' : d === 'TRD' ? 'amber' : 'slate'

export const statusTone = (s: string): Tone =>
  s === 'pending' ? 'amber'
  : s === 'scheduled' || s === 'approved' ? 'green'
  : s === 'rejected' ? 'red'
  : 'slate'

export const sourceTone = (s?: string): Tone =>
  s === 'upload' ? 'blue' : s === 'live' ? 'green' : s === 'demo' ? 'amber' : s === 'manual' ? 'violet' : 'slate'

export const sourceLabel = (s?: string) =>
  s === 'upload' ? 'uploaded' : s === 'live' ? 'external' : s === 'demo' ? 'demo' : s === 'manual' ? 'manual' : 'seed'
