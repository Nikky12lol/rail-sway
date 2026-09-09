'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, Download, FileWarning } from 'lucide-react'
import MetricStrip from '@/components/MetricStrip'
import OverlapTimeline from '@/components/OverlapTimeline'
import StatusBadge, { sourceTone, sourceLabel } from '@/components/StatusBadge'
import { api } from '@/lib/api'

type ImportStats = { imported: number; skipped_duplicates: number; rejected: number; cleared: number; errors: { row: number; reason: string }[] }

const prioTone = (p: number) => (p <= 1 ? 'red' : p === 2 ? 'amber' : 'slate') as 'red' | 'amber' | 'slate'

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function TimetablePage() {
  const [trains, setTrains] = useState<any[]>([])
  const [section, setSection] = useState('Bhadrak–Jajpur')
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [columnsDoc, setColumnsDoc] = useState<any>(null)
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [replace, setReplace] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (sec = section, d = day) => {
    const t = await api.trainsLive(sec, d).catch(() => [])
    setTrains(Array.isArray(t) ? t : [])
  }

  useEffect(() => {
    load()
    api.trainsColumns().then(setColumnsDoc).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setUploadError(''); setStats(null)
    try {
      const s = await api.importTimetable(f, replace ? { replace: true, section, day } : undefined)
      setStats(s)
      await load()
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const uploaded = trains.filter((t) => t.source === 'upload').length
  const external = trains.some((t) => t.source === 'live')

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="section-label mb-1">Timetable · operating constraint</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Railway Timetable</h1>
          <p className="text-sm text-slate-400 mt-0.5">Section: Bhadrak – Jajpur – Keonjhar Road</p>
        </div>
        <div className="flex gap-2.5">
          <a href={api.sampleCsvUrl(day, section)} className="btn-ghost flex items-center gap-2 !py-2 text-xs">
            <Download className="w-4 h-4" /> Sample CSV
          </a>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-primary flex items-center gap-2 !py-2 text-xs">
            <Upload className="w-4 h-4" /> {busy ? 'Importing…' : 'Upload CSV/XLSX'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="mb-4">
        <MetricStrip items={[
          { label: 'Trains loaded', value: trains.length, sub: `${section} · ${day}` },
          { label: 'Uploaded', value: uploaded },
          { label: 'Priority ≤ P2', value: trains.filter((t) => (t.priority || 3) <= 2).length },
          { label: 'Source', value: external ? 'External' : uploaded ? 'Uploaded' : 'Demo', sub: external ? 'IR feed configured' : 'seed / generated' },
        ]} />
      </div>

      <div className="panel-pad mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-slate-400">Section
            <select value={section} onChange={(e) => { setSection(e.target.value); load(e.target.value, day) }} className="input ml-2 !py-1.5">
              <option>Bhadrak–Jajpur</option>
              <option>Jajpur–Keonjhar Road</option>
              <option>Bhadrak–Keonjhar Road</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">Operating date
            <input type="date" value={day} onChange={(e) => { setDay(e.target.value); load(section, e.target.value) }} className="input ml-2 !py-1.5" />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-primary-500 w-4 h-4" />
            Replace uploaded rows for this section/date on import
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          Expected columns: <span className="font-mono text-slate-400">{columnsDoc?.columns || 'train_number*, train_name*, scheduled_time* (ISO), train_type, priority (1-5), section, origin, destination, status, delay_minutes, latitude, longitude'}</span>.
          Direction is derived as origin → destination. Not connected to a live Indian Railways feed unless IR_API_BASE_URL is configured.
        </p>
      </div>

      {uploadError && (
        <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <FileWarning className="w-4 h-4 shrink-0" /> {uploadError}
        </p>
      )}

      {stats && (
        <div className="panel-pad mb-4">
          <div className="section-label mb-2">Import result</div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-300">{stats.imported} valid rows imported</span>
            {stats.cleared > 0 && <span className="px-3 py-1 rounded-md bg-primary-500/15 text-primary-300">{stats.cleared} old uploaded rows cleared</span>}
            <span className="px-3 py-1 rounded-md bg-white/5 text-slate-400">{stats.skipped_duplicates} duplicates skipped</span>
            <span className={`px-3 py-1 rounded-md ${stats.rejected ? 'bg-rose-500/15 text-rose-300' : 'bg-white/5 text-slate-400'}`}>{stats.rejected} rejected</span>
          </div>
          {stats.errors.length > 0 && (
            <ul className="mt-2 text-rose-300/90 space-y-1 max-h-36 overflow-auto font-mono text-[11px]">
              {stats.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="panel overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[900px]">
            <thead>
              <tr><th>Train</th><th>Type</th><th>Entry → Exit</th><th>Scheduled</th><th>Priority</th><th>Status</th><th>Source</th></tr>
            </thead>
            <tbody>
              {trains.map((t) => (
                <tr key={`${t.train_number}-${t.scheduled_time}`}>
                  <td className="whitespace-nowrap"><span className="font-mono font-medium text-slate-100">{t.train_number}</span> <span className="text-slate-500 text-xs">{t.train_name}</span></td>
                  <td className="text-slate-400">{t.train_type}</td>
                  <td className="text-slate-300 whitespace-nowrap">{t.origin || '?'} → {t.destination || '?'}</td>
                  <td className="text-slate-300 whitespace-nowrap tabular-nums">{fmtTime(t.scheduled_time)}</td>
                  <td><StatusBadge tone={prioTone(t.priority)}>P{t.priority}</StatusBadge></td>
                  <td className="text-slate-400">{t.status}</td>
                  <td><StatusBadge tone={sourceTone(t.source)}>{sourceLabel(t.source)}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trains.length === 0 && <p className="py-6 text-center text-slate-500 text-sm">Timetable unavailable for this section/date — upload a file above.</p>}
      </div>

      <div className="panel-pad">
        <OverlapTimeline
          trains={trains.filter((t) => t.scheduled_time).map((t) => ({
            train_number: t.train_number, scheduled_time: t.scheduled_time, priority: t.priority, level: 'clear' as const,
          }))}
          requests={[]}
          windows={[]}
          maxTrains={14}
        />
        <p className="mt-2 text-[11px] text-slate-600">Scheduled instants from the loaded timetable — not live train movements.</p>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Next: <Link href="/block-planner" className="link">run the analysis in the AI Planner →</Link>
      </p>
    </div>
  )
}
