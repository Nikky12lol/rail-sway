'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const DEPARTMENTS = ['ENG', 'SNT', 'TRD', 'MECH', 'ELEC', 'OPTG']
const URGENCIES = ['low', 'normal', 'high', 'critical']
const SECTIONS = ['Bhadrak–Jajpur', 'Jajpur–Keonjhar Road', 'Bhadrak–Keonjhar Road']

export default function MaintenanceForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    task_id: '',
    department: 'ENG',
    work_type: 'tamping',
    section: SECTIONS[0],
    location: '',
    requested_date: new Date().toISOString().slice(0, 10),
    duration: 2,
    urgency: 'normal',
    description: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.task_id.trim() || !form.location.trim() || !form.work_type.trim()) {
      setError('Task ID, work type and location are required.')
      return
    }
    if (!(form.duration > 0 && form.duration <= 12)) {
      setError('Duration must be between 0 and 12 hours.')
      return
    }
    setBusy(true)
    try {
      await api.maintenanceCreate({ ...form, duration: Number(form.duration) })
      onCreated()
    } catch (err: any) {
      setError(err.message || 'Submission failed. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 className="panel-title text-sm mb-1">Submit maintenance request</h2>
      <p className="panel-sub mb-4 text-xs">Filed by the department into the shared Rail-Sway register.</p>
      <div className="grid md:grid-cols-3 gap-3.5">
        <label className="text-xs font-medium text-slate-400">Task ID *
          <input value={form.task_id} onChange={(e) => set('task_id', e.target.value)} placeholder="MT-ENG-043" className="input mt-1.5 w-full font-mono" />
        </label>
        <label className="text-xs font-medium text-slate-400">Department
          <select value={form.department} onChange={(e) => set('department', e.target.value)} className="input mt-1.5 w-full">
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-400">Work type *
          <input value={form.work_type} onChange={(e) => set('work_type', e.target.value)} placeholder="tamping" className="input mt-1.5 w-full" />
        </label>
        <label className="text-xs font-medium text-slate-400">Section
          <select value={form.section} onChange={(e) => set('section', e.target.value)} className="input mt-1.5 w-full">
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-400">Location / KM *
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Km 233/1-234/0" className="input mt-1.5 w-full" />
        </label>
        <label className="text-xs font-medium text-slate-400">Requested date
          <input type="date" value={form.requested_date} onChange={(e) => set('requested_date', e.target.value)} className="input mt-1.5 w-full" />
        </label>
        <label className="text-xs font-medium text-slate-400">Duration (hrs)
          <input type="number" step="0.5" min="0.5" max="12" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))} className="input mt-1.5 w-full" />
        </label>
        <label className="text-xs font-medium text-slate-400">Priority
          <select value={form.urgency} onChange={(e) => set('urgency', e.target.value)} className="input mt-1.5 w-full">
            {URGENCIES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-400">Remarks
          <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes" className="input mt-1.5 w-full" />
        </label>
      </div>
      {error && <p className="mt-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-4 py-2.5">{error}</p>}
      <div className="mt-4 flex gap-2.5">
        <button type="submit" disabled={busy} className="btn-primary !py-2 text-xs">
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-xs">
          Cancel
        </button>
      </div>
    </form>
  )
}
