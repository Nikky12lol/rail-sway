'use client'

export type MaintRow = {
  id?: number
  task_id: string
  department: string
  section: string
  location: string
  work_type: string
  duration: number
  urgency: string
  status: string
}

const urgencyPill = (u: string) =>
  u === 'critical'
    ? 'bg-rose-100 text-rose-700'
    : u === 'high'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-primary-100 text-primary-700'

export default function MaintenanceTable({
  rows,
  selected,
  onToggle,
}: {
  rows: MaintRow[]
  selected: string[]
  onToggle: (taskId: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-3 pr-2 font-medium"></th>
            <th className="py-3 pr-4 font-medium">Task</th>
            <th className="py-3 pr-4 font-medium">Dept</th>
            <th className="py-3 pr-4 font-medium">Section</th>
            <th className="py-3 pr-4 font-medium">Work</th>
            <th className="py-3 pr-4 font-medium">Dur (h)</th>
            <th className="py-3 pr-4 font-medium">Urgency</th>
            <th className="py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.task_id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-primary-50/50">
              <td className="py-3 pr-2">
                <input
                  type="checkbox"
                  checked={selected.includes(r.task_id)}
                  onChange={() => onToggle(r.task_id)}
                  className="accent-primary-600 w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="py-3 pr-4 font-medium text-slate-800">{r.task_id}</td>
              <td className="py-3 pr-4 text-slate-600">{r.department}</td>
              <td className="py-3 pr-4 text-slate-600">{r.section}</td>
              <td className="py-3 pr-4 text-slate-600">{r.work_type}</td>
              <td className="py-3 pr-4 text-slate-600">{r.duration}</td>
              <td className="py-3 pr-4">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${urgencyPill(r.urgency)}`}>
                  {r.urgency}
                </span>
              </td>
              <td className="py-3 text-slate-500">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-slate-400">No maintenance requests found.</p>}
    </div>
  )
}
