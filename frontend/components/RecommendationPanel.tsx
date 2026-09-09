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
    <div className="bg-white rounded-xl shadow p-5 border-l-4 border-teal-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">AI Recommendation</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded ${confidence === 'HIGH' ? 'bg-green-100 text-green-700' : confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {confidence} CONFIDENCE
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{reason}</p>
      <div className="mt-4 flex gap-3">
        <button onClick={onApprove} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" /> Approve Block
        </button>
        <button onClick={onReject} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  )
}
