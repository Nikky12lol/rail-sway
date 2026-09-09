'use client'

export type OverlapTrain = {
  train_number: string
  train_name?: string
  scheduled_time: string
  priority?: number
  /** how this train relates to the candidate windows (computed by parent from backend affected_train_ids) */
  level?: 'recommended' | 'candidate' | 'clear'
}

export type OverlapWindow = {
  start: string
  end: string
  recommended?: boolean
  baseline?: boolean
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

const dotColor = (level?: string) =>
  level === 'recommended' ? 'bg-rose-400 ring-rose-400/25' : level === 'candidate' ? 'bg-amber-400 ring-amber-400/25' : 'bg-slate-600 ring-white/5'

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

  const rec = windows.find((w) => w.recommended) || windows.find((w) => !w.baseline)
  const recSpan =
    rec && minutesOf(rec.start) !== null && minutesOf(rec.end) !== null
      ? { left: pct(minutesOf(rec.start) as number), width: Math.max(2, pct(minutesOf(rec.end) as number) - pct(minutesOf(rec.start) as number)) }
      : null

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="panel-title text-sm">Timetable × maintenance overlap</h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Affected</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Near candidate</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600"></span>Clear</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2 rounded-sm bg-primary-500/30 border border-primary-400"></span>Block</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2 rounded-sm bg-white/5 border border-dashed border-slate-500"></span>Baseline</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 mb-4">Train markers are real scheduled times from the loaded timetable; bands are evaluated block windows. Affected states come from backend overlap results.</p>

      <div className="flex mb-1.5">
        <div className="w-24 shrink-0"></div>
        <div className="flex-1 relative h-4">
          {TICKS.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 text-[10px] text-slate-600 tabular-nums" style={{ left: `${pct(t)}%` }}>
              {tickLabel(t)}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {shown.map((t) => (
          <div key={`${t.train_number}-${t.scheduled_time}`} className="flex items-center">
            <div className="w-24 shrink-0 pr-2 text-right">
              <div className="text-[11px] font-mono font-medium text-slate-300 truncate">{t.train_number}</div>
              <div className="text-[10px] text-slate-600 truncate tabular-nums">{fmt(t.scheduled_time)}{t.priority && t.priority <= 2 ? ' · P' + t.priority : ''}</div>
            </div>
            <div className="flex-1 relative h-5 bg-white/[0.03] rounded">
              <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-4 ${dotColor(t.level)}`} style={{ left: `${pct(t.m as number)}%` }} title={`${t.train_number} ${fmt(t.scheduled_time)}`} />
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-xs text-slate-600 py-2">No train times in view — load a timetable first.</p>}
      </div>
      {hidden > 0 && <p className="text-[11px] text-slate-600 mt-1.5 ml-24">…and {hidden} more train(s) in this period.</p>}

      {windows.length > 0 && (
        <div className="mt-4">
          <div className="section-label mb-1.5 ml-24">Candidate blocks</div>
          <div className="flex">
            <div className="w-24 shrink-0"></div>
            <div className="flex-1 relative h-10 bg-white/[0.02] rounded-md border border-white/5">
              {windows.map((w, i) => {
                const a = minutesOf(w.start)
                const b = minutesOf(w.end)
                if (a === null || b === null) return null
                if (w.baseline) {
                  return (
                    <div
                      key={'b' + i}
                      className="absolute top-1 bottom-1 rounded flex items-center justify-center text-[10px] font-medium whitespace-nowrap overflow-hidden px-1 bg-white/5 border border-dashed border-slate-500 text-slate-500"
                      style={{ left: `${pct(a)}%`, width: `${Math.max(4, pct(b) - pct(a))}%` }}
                      title={`Baseline ${fmt(w.start)}–${fmt(w.end)}`}
                    >
                      baseline
                    </div>
                  )
                }
                return (
                  <div
                    key={i}
                    className={`absolute top-1 bottom-1 rounded flex items-center justify-center text-[10px] font-semibold whitespace-nowrap overflow-hidden px-1 ${
                      w.recommended ? 'bg-primary-500/30 border border-primary-400 text-primary-100' : 'bg-amber-400/15 border border-amber-400/50 text-amber-200/90'
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

      {requests.length > 0 && recSpan && (
        <div className="mt-3">
          <div className="section-label mb-1.5 ml-24">Grouped maintenance (inside recommended block)</div>
          <div className="space-y-1">
            {requests.map((r) => (
              <div key={r.task_id} className="flex items-center">
                <div className="w-24 shrink-0 pr-2 text-right">
                  <div className="text-[11px] font-mono font-medium text-slate-300 truncate">{r.task_id}</div>
                  <div className="text-[10px] text-slate-600 truncate tabular-nums">{r.duration}h</div>
                </div>
                <div className="flex-1 relative h-5">
                  <div
                    className="absolute top-0 bottom-0 rounded bg-primary-600/80 flex items-center px-2 text-[10px] font-medium text-white whitespace-nowrap overflow-hidden"
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
