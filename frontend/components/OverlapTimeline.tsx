'use client'

export type OverlapTrain = {
  train_number: string
  train_name?: string
  scheduled_time: string
  priority?: number
  /** how this train relates to the candidate windows (computed by parent) */
  level?: 'recommended' | 'candidate' | 'clear'
}

export type OverlapWindow = {
  start: string
  end: string
  recommended?: boolean
  label?: string
}

export type OverlapRequest = {
  task_id: string
  department: string
  work_type: string
  duration: number
}

const DAY_START = 6 * 60 // 06:00
const DAY_END = 22 * 60 // 22:00

function minutesOf(iso: string): number | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const pct = (m: number) => Math.min(100, Math.max(0, ((m - DAY_START) / (DAY_END - DAY_START)) * 100))

const TICKS = [360, 480, 600, 720, 840, 960, 1080, 1200, 1320]
const tickLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:00`

export default function OverlapTimeline({
  trains,
  requests,
  windows,
  maxTrains = 10,
}: {
  trains: OverlapTrain[]
  requests: OverlapRequest[]
  windows: OverlapWindow[]
  maxTrains?: number
}) {
  const timed = trains
    .map((t) => ({ ...t, m: minutesOf(t.scheduled_time) }))
    .filter((t) => t.m !== null)
    .sort((a, b) => (a.m as number) - (b.m as number))
  const shown = timed.slice(0, maxTrains)
  const hidden = timed.length - shown.length

  const rec = windows.find((w) => w.recommended) || windows[0]
  const recSpan =
    rec && minutesOf(rec.start) !== null && minutesOf(rec.end) !== null
      ? { left: pct(minutesOf(rec.start) as number), width: Math.max(2, pct(minutesOf(rec.end) as number) - pct(minutesOf(rec.start) as number)) }
      : null

  const dotColor = (level?: string) =>
    level === 'recommended' ? 'bg-rose-500 ring-rose-200' : level === 'candidate' ? 'bg-amber-500 ring-amber-200' : 'bg-slate-300 ring-slate-100'

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-semibold text-slate-800">Timetable × Maintenance Overlap</h3>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Train in block</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Near candidate</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>Unaffected</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-2.5 rounded bg-primary-500/25 border border-primary-400"></span>Block window</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-5">Train dots are real scheduled times from the loaded timetable; bands are the AI candidate windows.</p>

      {/* time axis */}
      <div className="flex mb-2">
        <div className="w-28 shrink-0"></div>
        <div className="flex-1 relative h-5">
          {TICKS.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 text-[11px] text-slate-400 tabular-nums" style={{ left: `${pct(t)}%` }}>
              {tickLabel(t)}
            </span>
          ))}
        </div>
      </div>

      {/* train rows */}
      <div className="space-y-1.5">
        {shown.map((t) => (
          <div key={`${t.train_number}-${t.scheduled_time}`} className="flex items-center">
            <div className="w-28 shrink-0 pr-2 text-right">
              <div className="text-xs font-mono font-medium text-slate-700 truncate">{t.train_number}</div>
              <div className="text-[11px] text-slate-400 truncate">{fmt(t.scheduled_time)}{t.priority && t.priority <= 2 ? ' · P' + t.priority : ''}</div>
            </div>
            <div className="flex-1 relative h-6 bg-slate-50 rounded-md">
              <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-4 ${dotColor(t.level)}`} style={{ left: `${pct(t.m as number)}%` }} title={`${t.train_number} ${fmt(t.scheduled_time)}`} />
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-slate-400 py-2">No train times in view — load a timetable first.</p>}
      </div>
      {hidden > 0 && <p className="text-xs text-slate-400 mt-2 ml-28">…and {hidden} more train(s) in this period.</p>}

      {/* candidate bands */}
      {windows.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 ml-28">Candidate blocks</div>
          <div className="flex">
            <div className="w-28 shrink-0"></div>
            <div className="flex-1 relative h-12 bg-slate-50 rounded-lg border border-slate-100">
              {windows.map((w, i) => {
                const a = minutesOf(w.start)
                const b = minutesOf(w.end)
                if (a === null || b === null) return null
                return (
                  <div
                    key={i}
                    className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center justify-center text-[11px] font-semibold whitespace-nowrap overflow-hidden px-1 ${
                      w.recommended ? 'bg-primary-500/25 border-2 border-primary-500 text-primary-800' : 'bg-amber-400/20 border border-amber-400 text-amber-700'
                    }`}
                    style={{ left: `${pct(a)}%`, width: `${Math.max(4, pct(b) - pct(a))}%` }}
                    title={`${w.label || ''} ${fmt(w.start)}–${fmt(w.end)}`}
                  >
                    {fmt(w.start)}–{fmt(w.end)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* grouped maintenance */}
      {requests.length > 0 && recSpan && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 ml-28">Grouped maintenance (fits the recommended block)</div>
          <div className="space-y-1.5">
            {requests.map((r) => (
              <div key={r.task_id} className="flex items-center">
                <div className="w-28 shrink-0 pr-2 text-right">
                  <div className="text-xs font-mono font-medium text-slate-700 truncate">{r.task_id}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.duration}h</div>
                </div>
                <div className="flex-1 relative h-6">
                  <div
                    className="absolute top-0.5 bottom-0.5 rounded-md bg-slate-700/85 flex items-center px-2 text-[11px] font-medium text-white whitespace-nowrap overflow-hidden"
                    style={{ left: `${recSpan.left}%`, width: `${recSpan.width}%` }}
                    title={`${r.department} — ${r.work_type}`}
                  >
                    {r.department} · {r.work_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
