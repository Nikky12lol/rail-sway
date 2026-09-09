'use client'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function RecommendationPanel({
  reason,
  confidence,
  onApprove,
  onReject,
  busy,
}: {
  reason: string
  confidence: string
  onApprove: () => void
  onReject: () => void
  busy?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 border-l-4 border-l-primary-500 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800">AI Recommendation</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full tracking-wide ${confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-700' : confidence === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
          {confidence} CONFIDENCE
        </span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{reason}</p>
      <div className="mt-5 flex gap-3">
        <button onClick={onApprove} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
          <CheckCircle2 className="w-4 h-4" /> Approve Block
        </button>
        <button onClick={onReject} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  )
}
