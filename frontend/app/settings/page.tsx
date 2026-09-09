'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'

function BoolRow({ label, value, hint }: { label: string; value: boolean; hint: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 text-sm">
      <span className="text-slate-300 w-56 shrink-0">{label}</span>
      <StatusBadge tone={value ? 'green' : 'slate'}>{value ? 'Configured' : 'Not configured'}</StatusBadge>
      <span className="text-xs text-slate-500 ml-auto text-right">{hint}</span>
    </div>
  )
}

export default function SettingsPage() {
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    api.systemStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const db = status?.database
  const tt = status?.timetable
  const ai = status?.ai

  return (
    <div>
      <div className="section-label mb-1">System · configuration, no secrets exposed</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-5">Settings</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel-pad">
          <h2 className="panel-title text-sm mb-2">Timetable source</h2>
          {!status && <p className="text-sm text-slate-500">Backend unreachable — showing defaults.</p>}
          {status && (
            <>
              <BoolRow label="External IR feed" value={!!tt?.external_configured} hint={tt?.note || ''} />
              <div className="mt-2 text-xs text-slate-500">Upload, seed, demo and manual rows are labelled per-row in Timetable. Nothing is presented as live unless the feed above is configured.</div>
            </>
          )}
        </div>

        <div className="panel-pad">
          <h2 className="panel-title text-sm mb-2">AI provider</h2>
          {!status && <p className="text-sm text-slate-500">Backend unreachable.</p>}
          {status && (
            <>
              <BoolRow label="Heuristic engine" value={true} hint={ai?.engine || 'built-in fallback'} />
              <BoolRow label="Gemini explanation" value={!!ai?.gemini_configured} hint="Polishes recommendation text" />
              <BoolRow label="OpenAI explanation" value={!!ai?.openai_configured} hint="Fallback polisher" />
            </>
          )}
        </div>

        <div className="panel-pad">
          <h2 className="panel-title text-sm mb-2">Demo / seed data</h2>
          {!db && <p className="text-sm text-slate-500">Counts unavailable.</p>}
          {db && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Maintenance requests', db.maintenance_requests],
                ['Trains', db.trains],
                ['Block windows', db.block_windows],
                ['Decision logs', db.decision_logs],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                  <div className="text-lg font-bold text-slate-100 tabular-nums">{v as number}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">{k as string}</div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">Database dialect: <span className="font-mono text-slate-300">{db?.dialect || '—'}</span> · Section: Bhadrak – Jajpur – Keonjhar Road</p>
        </div>

        <div className="panel-pad">
          <h2 className="panel-title text-sm mb-2">About this system</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Rail-Sway is an AI-assisted decision-support system for coordinated railway maintenance blocks.
            It recommends; the controller decides. It never autonomously executes operations, reschedules
            trains, or reports live positions.
          </p>
          <p className="mt-2 text-xs text-slate-500 font-mono">{status ? `${status.service} ${status.version}` : 'backend status unknown'} · frontend v2.0</p>
        </div>
      </div>
    </div>
  )
}
