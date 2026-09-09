'use client'

export default function DecisionHistoryTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50/80">
            <th className="py-3.5 px-5 font-medium">Time</th>
            <th className="py-3.5 px-5 font-medium">Tasks</th>
            <th className="py-3.5 px-5 font-medium">Recommended</th>
            <th className="py-3.5 px-5 font-medium">Reason</th>
            <th className="py-3.5 px-5 font-medium">Decision</th>
            <th className="py-3.5 px-5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-primary-50/50">
              <td className="py-3.5 px-5 whitespace-nowrap text-slate-500">{new Date(r.timestamp).toLocaleString('en-IN')}</td>
              <td className="py-3.5 px-5 font-mono text-xs text-slate-700">{r.tasks}</td>
              <td className="py-3.5 px-5 font-medium text-slate-800">{r.recommended}</td>
              <td className="py-3.5 px-5 text-slate-500 max-w-md truncate" title={r.reason}>{r.reason}</td>
              <td className="py-3.5 px-5 text-slate-700">{r.controller_decision}</td>
              <td className="py-3.5 px-5 text-slate-700">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-8 text-center text-slate-400">No decisions logged yet.</p>}
    </div>
  )
}
