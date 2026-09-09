'use client'
import StatusBadge, { urgencyTone, statusTone } from './StatusBadge'

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
  requested_date?: string
  created_at?: string
}

export default function MaintenanceTable({
  rows,
  selected,
  onToggle,
  compat,
  onDelete,
  selectable = true,
}: {
  rows: MaintRow[]
  selected: string[]
  onToggle: (taskId: string) => void
  /** task_id -> 'compatible' | 'conflict' (from backend compatibility analysis) */
  compat?: Record<string, 'compatible' | 'conflict'>
  onDelete?: (row: MaintRow) => void
  selectable?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl min-w-[880px]">
        <thead>
          <tr>
            {selectable && <th></th>}
            <th>Request ID</th>
            <th>Dept</th>
            <th>Section / Location</th>
            <th>Work type</th>
            <th>Dur.</th>
            <th>Priority</th>
            {compat && <th>Compatibility</th>}
            <th>Status</th>
            {onDelete && <th className="!text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.task_id}>
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.task_id)}
                    onChange={() => onToggle(r.task_id)}
                    className="accent-primary-500 w-4 h-4 cursor-pointer"
                  />
                </td>
              )}
              <td className="font-mono font-medium text-slate-100 whitespace-nowrap">{r.task_id}</td>
              <td><StatusBadge tone={r.department === 'ENG' ? 'blue' : r.department === 'SNT' ? 'violet' : r.department === 'TRD' ? 'amber' : 'slate'}>{r.department}</StatusBadge></td>
              <td className="text-slate-300 whitespace-nowrap">{r.section} · <span className="text-slate-500">{r.location}</span></td>
              <td className="text-slate-300">{r.work_type}</td>
              <td className="text-slate-300 tabular-nums">{r.duration}h</td>
              <td><StatusBadge tone={urgencyTone(r.urgency)}>{r.urgency}</StatusBadge></td>
              {compat && (
                <td>
                  {compat[r.task_id] === 'conflict'
                    ? <StatusBadge tone="red">Conflict</StatusBadge>
                    : compat[r.task_id] === 'compatible'
                      ? <StatusBadge tone="green">Compatible</StatusBadge>
                      : <span className="text-slate-600">—</span>}
                </td>
              )}
              <td><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td>
              {onDelete && (
                <td className="!text-right">
                  <button onClick={() => onDelete(r)} className="text-xs font-medium text-rose-300/80 hover:text-rose-200 transition-colors">Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-slate-500 text-sm">No maintenance requests found.</p>}
    </div>
  )
}
