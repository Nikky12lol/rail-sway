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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 pr-2"></th>
            <th className="py-2 pr-4">Task</th>
            <th className="py-2 pr-4">Dept</th>
            <th className="py-2 pr-4">Section</th>
            <th className="py-2 pr-4">Work</th>
            <th className="py-2 pr-4">Dur (h)</th>
            <th className="py-2 pr-4">Urgency</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.task_id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={selected.includes(r.task_id)}
                  onChange={() => onToggle(r.task_id)}
                  className="accent-teal-600 w-4 h-4"
                />
              </td>
              <td className="py-2 pr-4 font-medium">{r.task_id}</td>
              <td className="py-2 pr-4">{r.department}</td>
              <td className="py-2 pr-4">{r.section}</td>
              <td className="py-2 pr-4">{r.work_type}</td>
              <td className="py-2 pr-4">{r.duration}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs ${r.urgency === 'critical' ? 'bg-red-100 text-red-700' : r.urgency === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {r.urgency}
                </span>
              </td>
              <td className="py-2 text-gray-500">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-gray-400">No maintenance requests found.</p>}
    </div>
  )
}
