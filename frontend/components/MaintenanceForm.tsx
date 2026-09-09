'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const DEPARTMENTS = ['ENG', 'SNT', 'TRD', 'MECH', 'ELEC', 'OPTG']
const URGENCIES = ['low', 'normal', 'high', 'critical']
const SECTIONS = ['Bhadrak–Jajpur', 'Jajpur–Keonjhar Road', 'Bhadrak–Keonjhar Road']

const inputCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

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
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
      <h2 className="font-semibold text-slate-800 mb-1">Submit Maintenance Request</h2>
      <p className="text-sm text-slate-500 mb-5">Filed by the department into the shared Rail-Sway register.</p>
      <div className="grid md:grid-cols-3 gap-4">
        <label className="text-sm font-medium text-slate-700">Task ID *
          <input value={form.task_id} onChange={(e) => set('task_id', e.target.value)} placeholder="MT-ENG-043" className={`${inputCls} mt-1 font-mono`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Department
          <select value={form.department} onChange={(e) => set('department', e.target.value)} className={`${inputCls} mt-1`}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Work type *
          <input value={form.work_type} onChange={(e) => set('work_type', e.target.value)} placeholder="tamping" className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Section
          <select value={form.section} onChange={(e) => set('section', e.target.value)} className={`${inputCls} mt-1`}>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Location / KM *
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Km 233/1-234/0" className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Requested date
          <input type="date" value={form.requested_date} onChange={(e) => set('requested_date', e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Duration (hrs)
          <input type="number" step="0.5" min="0.5" max="12" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Priority
          <select value={form.urgency} onChange={(e) => set('urgency', e.target.value)} className={`${inputCls} mt-1`}>
            {URGENCIES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-1">Remarks
          <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes" className={`${inputCls} mt-1`} />
        </label>
      </div>
      {error && <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm shadow-primary-600/25 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit Request'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]">
          Cancel
        </button>
      </div>
    </form>
  )
}
