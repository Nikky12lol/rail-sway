'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import MaintenanceForm from '@/components/MaintenanceForm'
import MaintenanceTable from '@/components/MaintenanceTable'
import MetricStrip from '@/components/MetricStrip'
import { api } from '@/lib/api'

type ImportStats = { imported: number; skipped_duplicates: number; rejected: number; errors: { row: number; reason: string }[] }

export default function RequestsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [compat, setCompat] = useState<Record<string, 'compatible' | 'conflict'>>({})
  const [compatSummary, setCompatSummary] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [importError, setImportError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const d = await api.maintenance()
      setRows(d)
    } catch {
      setError('Backend unreachable — requests cannot be loaded.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Compatibility of the working set (selection, else all pending) — real backend call
  useEffect(() => {
    const pool = rows.filter((r) => r.status === 'pending')
    const working = selected.length ? pool.filter((r) => selected.includes(r.task_id)) : pool
    if (!working.length) { setCompat({}); setCompatSummary(''); return }
    api.compatibility(working.map((r) => ({
      task_id: r.task_id, department: r.department, section: r.section,
      work_type: r.work_type, duration: r.duration, urgency: r.urgency,
    })))
      .then((data) => {
        if (!data) return
        const map: Record<string, 'compatible' | 'conflict'> = {}
        for (const c of data.clubs || []) for (const m of c.members || []) map[m.task_id] = 'compatible'
        for (const c of data.conflicts || []) for (const id of c.pair || []) map[id] = 'conflict'
        setCompat(map)
        setCompatSummary(data.summary || '')
      })
      .catch(() => {})
  }, [rows, selected])

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
      try { localStorage.setItem('railsway:selected', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })

  const onDelete = async (row: any) => {
    if (!row.id || !confirm(`Delete request ${row.task_id}?`)) return
    try {
      await api.maintenanceDelete(row.id)
      setSelected((s) => s.filter((x) => x !== row.task_id))
      load()
    } catch (e: any) {
      setError(e.message || 'Delete failed.')
    }
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setImportError(''); setImportStats(null)
    try {
      setImportStats(await api.maintenanceImport(f))
      load()
    } catch (e: any) {
      setImportError(e.message || 'Import failed.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const critical = rows.filter((r) => r.urgency === 'critical' && r.status === 'pending')
  const depts = [...new Set(rows.map((r) => r.department))]

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="section-label mb-1">Requests · multi-department input</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Maintenance Requests</h1>
          <p className="text-sm text-slate-400 mt-0.5">Bhadrak – Jajpur – Keonjhar Road · independent departmental work orders</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost flex items-center gap-2">
            <Upload className="w-4 h-4" /> {busy ? 'Importing…' : 'Import CSV/XLSX'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="mb-4">
        <MetricStrip items={[
          { label: 'Pending', value: pending.length },
          { label: 'Critical', value: critical.length },
          { label: 'Departments', value: depts.length, sub: depts.join(' · ') },
          { label: 'Selected', value: selected.length, sub: 'for analysis' },
        ]} />
      </div>

      {showForm && (
        <div className="panel-pad mb-4">
          <MaintenanceForm onCreated={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
        </div>
      )}
      {error && <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-4 py-2.5">{error}</p>}
      {importError && <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-4 py-2.5">{importError}</p>}
      {importStats && (
        <div className="panel-pad mb-4">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-300">{importStats.imported} imported</span>
            <span className="px-3 py-1 rounded-md bg-white/5 text-slate-400">{importStats.skipped_duplicates} duplicates skipped</span>
            <span className={`px-3 py-1 rounded-md ${importStats.rejected ? 'bg-rose-500/15 text-rose-300' : 'bg-white/5 text-slate-400'}`}>{importStats.rejected} rejected</span>
          </div>
          {importStats.errors.length > 0 && (
            <ul className="mt-2 text-xs text-rose-300/90 space-y-1 max-h-32 overflow-auto font-mono">
              {importStats.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="panel overflow-hidden">
        <MaintenanceTable rows={rows} selected={selected} onToggle={toggle} compat={compat} onDelete={onDelete} />
        {loading && <p className="py-6 text-center text-slate-500 text-sm">Loading requests…</p>}
      </div>
      {compatSummary && <p className="mt-2 text-xs text-slate-500">{compatSummary}</p>}

      <div className="mt-3 flex items-center gap-3">
        <Link href="/timetable" className="btn-ghost !py-2 text-xs">Next: Timetable →</Link>
        <Link href="/block-planner" className="btn-primary !py-2 text-xs">Continue in AI Planner →</Link>
      </div>
    </div>
  )
}
