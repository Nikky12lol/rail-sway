'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, Download, FileWarning } from 'lucide-react'
import { api } from '@/lib/api'

type ImportStats = { imported: number; skipped_duplicates: number; rejected: number; errors: { row: number; reason: string }[] }

const prioBadge = (p: number) =>
  p <= 1 ? 'bg-rose-100 text-rose-700' : p === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'

const srcBadge = (s?: string) =>
  s === 'upload' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'

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
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (sec = section, d = day) => {
    const t = await api.trainsLive(sec).catch(() => [])
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
      const s = await api.importTimetable(f)
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

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Timetable Management</h1>
          <p className="text-slate-500">The railway&apos;s operational schedule — the second input to block planning.</p>
        </div>
        <div className="flex gap-3">
          <a href={api.sampleCsvUrl(day, section)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]">
            <Download className="w-4 h-4" /> Sample CSV
          </a>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50">
            <Upload className="w-4 h-4" /> {busy ? 'Importing…' : 'Upload CSV / XLSX'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {[
          ['Trains loaded', trains.length],
          ['Uploaded rows', uploaded],
          ['Seed / demo rows', trains.length - uploaded],
          ['Section', section.split('–')[0]],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
            <div className="text-2xl font-bold text-slate-800">{v as string | number}</div>
            <div className="text-sm text-slate-500">{k as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Section
            <select value={section} onChange={(e) => { setSection(e.target.value); load(e.target.value, day) }} className="ml-2 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Bhadrak–Jajpur</option>
              <option>Jajpur–Keonjhar Road</option>
              <option>Bhadrak–Keonjhar Road</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Operating date
            <input type="date" value={day} onChange={(e) => { setDay(e.target.value); load(section, e.target.value) }} className="ml-2 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          <span className={`ml-auto text-xs font-medium px-3 py-1.5 rounded-full ${uploaded ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'}`}>
            {uploaded ? `${uploaded} uploaded timetable row(s) in view` : 'Showing seed demo timetable — upload a file to replace it'}
          </span>
        </div>
        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
          Expected columns: <span className="font-mono">{columnsDoc?.columns || 'train_number*, train_name*, scheduled_time* (ISO), train_type, priority (1-5), section, origin, destination, status, delay_minutes, latitude, longitude'}</span>.
          Direction is derived as origin → destination. This prototype is not connected to a live Indian Railways feed unless IR_API_BASE_URL is configured.
        </p>
      </div>

      {uploadError && (
        <p className="mb-5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <FileWarning className="w-4 h-4 shrink-0" /> {uploadError}
        </p>
      )}

      {stats && (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3">Import result</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{stats.imported} imported</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{stats.skipped_duplicates} duplicates skipped</span>
            <span className={`px-3 py-1 rounded-full font-medium ${stats.rejected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{stats.rejected} rejected</span>
          </div>
          {stats.errors.length > 0 && (
            <ul className="mt-3 text-sm text-rose-700 space-y-1 max-h-40 overflow-auto">
              {stats.errors.map((e, i) => <li key={i} className="font-mono text-xs">Row {e.row}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[950px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50/80">
                {['Train No.', 'Train Name', 'Direction', 'Section', 'Scheduled', 'Prio', 'Status', 'Source'].map((h) => (
                  <th key={h} className="py-3.5 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trains.map((t) => (
                <tr key={`${t.train_number}-${t.scheduled_time}`} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-primary-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">{t.train_number}</td>
                  <td className="py-3 px-4 text-slate-600">{t.train_name}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{t.origin || '?'} → {t.destination || '?'}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{t.section}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fmtTime(t.scheduled_time)}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prioBadge(t.priority)}`}>P{t.priority}</span></td>
                  <td className="py-3 px-4 text-slate-600">{t.status}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${srcBadge(t.source)}`}>{t.source === 'upload' ? 'uploaded' : 'seed demo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trains.length === 0 && <p className="py-8 text-center text-slate-400">No trains for this section/date — upload a timetable above.</p>}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Next step: run the analysis in the <Link href="/block-planner" className="font-medium text-primary-600 hover:underline">Block Planner</Link>.
      </p>
    </div>
  )
}
