'use client'

export default function DecisionHistoryTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="py-3 px-4">Time</th>
            <th className="py-3 px-4">Tasks</th>
            <th className="py-3 px-4">Recommended</th>
            <th className="py-3 px-4">Reason</th>
            <th className="py-3 px-4">Decision</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 px-4 whitespace-nowrap text-gray-500">{new Date(r.timestamp).toLocaleString('en-IN')}</td>
              <td className="py-3 px-4 font-mono text-xs">{r.tasks}</td>
              <td className="py-3 px-4 font-medium">{r.recommended}</td>
              <td className="py-3 px-4 text-gray-600 max-w-md truncate" title={r.reason}>{r.reason}</td>
              <td className="py-3 px-4">{r.controller_decision}</td>
              <td className="py-3 px-4">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-8 text-center text-gray-400">No decisions logged yet.</p>}
    </div>
  )
}
