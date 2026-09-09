'use client'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function RecommendationPanel({
  reason,
  confidence,
  onApprove,
  onReject,
  busy,
  decided,
}: {
  reason: string
  confidence: string
  onApprove: () => void
  onReject: () => void
  busy?: boolean
  decided?: string | null
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900 border-l-2 border-l-primary-500 p-5">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="panel-title text-sm">AI recommendation · why this window</h3>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${confidence === 'HIGH' ? 'bg-emerald-500/15 text-emerald-300' : confidence === 'MEDIUM' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>
          {confidence} CONFIDENCE
        </span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{reason}</p>
      {decided ? (
        <p className={`mt-4 text-sm font-medium px-4 py-2.5 rounded-lg border ${decided === 'approved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-rose-500/10 text-rose-300 border-rose-400/20'}`}>
          Already {decided} — duplicate decisions are not recorded. Review another candidate instead.
        </p>
      ) : (
        <div className="mt-4 flex gap-3 flex-wrap">
          <button onClick={onApprove} disabled={busy} className="btn-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Approve Block
          </button>
          <button onClick={onReject} disabled={busy} className="btn-ghost flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      )}
    </div>
  )
}
