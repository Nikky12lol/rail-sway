'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import ImpactTimeline from '@/components/ImpactTimeline'
import RecommendationPanel from '@/components/RecommendationPanel'
import OverlapTimeline from '@/components/OverlapTimeline'
import { api } from '@/lib/api'

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function ImpactPage({ params }: { params: Promise<{ windowId: string }> }) {
  const { windowId } = use(params)
  const [block, setBlock] = useState<any>(null)
  const [siblings, setSiblings] = useState<any[]>([])
  const [trains, setTrains] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    fetch(`${base}/blocks/${windowId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (b) => {
        if (!b) {
          const demo = { id: Number(windowId), section: 'Bhadrak–Jajpur', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 2.5 * 3600e3).toISOString(), affected_trains: 6, priority_trains_affected: 0, conflicts: 0, tsr_required: false, estimated_delay: 42, impact_score: 8.4, status: 'candidate', maintenance_ids: '', recommendation_reason: 'Offline demo: lowest-impact morning window with zero priority trains affected.' }
          setBlock(demo); setSiblings([demo]); setTrains([])
          return
        }
        setBlock(b)
        const [sib, live] = await Promise.all([
          fetch(`${base}/blocks?section=${encodeURIComponent(b.section)}`).then((r) => r.json()).catch(() => [b]),
          api.trainsLive(b.section).catch(() => []),
        ])
        setSiblings(Array.isArray(sib) && sib.length ? sib : [b])
        setTrains(Array.isArray(live) ? live : [])
      })
      .catch(() => {})
  }, [windowId])

  const decide = async (decision: string) => {
    if (block.controller_decision) {
      setMsg(`Already ${block.controller_decision} — duplicate decisions are not recorded.`)
      return
    }
    setBusy(true); setMsg('')
    try {
      const updated = await api.decide(Number(windowId), decision)
      setBlock(updated)
      setMsg(`Block ${decision} and recorded in the audit trail.`)
    } catch (e: any) {
      setMsg(/409|already/i.test(e.message || '') ? `Already decided: ${e.message}` : `Decision failed (${e.message}).`)
      // refresh: another session may have decided meanwhile
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      fetch(`${base}/blocks/${windowId}`).then((r) => (r.ok ? r.json() : null)).then((b) => b && setBlock(b)).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  if (!block) return <p className="text-slate-500">Loading impact analysis…</p>

  const inWin = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= new Date(block.start_time).getTime() && t <= new Date(block.end_time).getTime()
  }
  const insideTrains = trains.filter((t) => t.scheduled_time && inWin(t.scheduled_time))
  const groupedIds = (block.maintenance_ids || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const chartData = (siblings.length ? siblings : [block]).map((b: any) => ({
    affected_trains: b.affected_trains, priority_affected: b.priority_trains_affected,
    estimated_delay: b.estimated_delay, impact_score: b.impact_score,
  }))

  return (
    <div>
      <div className="text-sm text-slate-400 mb-1"><Link href="/block-planner" className="hover:underline">Block Planner</Link> / Impact Analysis</div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Impact Analysis — Window #{block.id}</h1>
      <p className="text-slate-500 mb-8">{block.section} · {new Date(block.start_time).toLocaleString('en-IN')} → {new Date(block.end_time).toLocaleString('en-IN')}</p>

      {/* WHY metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {[
          ['Affected trains', block.affected_trains, 'scheduled inside this window'],
          ['Priority trains', block.priority_trains_affected, 'Rajdhani / Duronto class'],
          ['Est. total delay', `${block.estimated_delay} min`, 'incl. cascade knock-ons'],
          ['Impact score', block.impact_score, `${block.conflicts} hard conflict(s)`],
        ].map(([k, v, sub]) => (
          <div key={k as string} className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
            <div className="text-2xl font-bold text-slate-800">{v as string | number}</div>
            <div className="text-sm font-medium text-slate-600">{k as string}</div>
            <div className="text-xs text-slate-400">{sub as string}</div>
          </div>
        ))}
      </div>

      {/* grouped requests + affected trains */}
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Maintenance grouped in this block ({groupedIds.length})</h3>
          {groupedIds.length ? (
            <div className="flex flex-wrap gap-2">
              {groupedIds.map((id: string) => (
                <span key={id} className="font-mono text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 text-white">{id}</span>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No linked requests recorded.</p>}
          <p className="mt-3 text-xs text-slate-400">TSR required: <span className="font-semibold text-slate-600">{block.tsr_required ? 'Yes — include caution working in crew briefing' : 'No'}</span></p>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Trains scheduled inside this window ({insideTrains.length})</h3>
          {insideTrains.length ? (
            <ul className="space-y-1.5 max-h-36 overflow-auto text-sm">
              {insideTrains.slice(0, 12).map((t: any) => (
                <li key={t.train_number} className="flex justify-between text-slate-600">
                  <span className="font-mono">{t.train_number}</span>
                  <span>{fmt(t.scheduled_time)}{t.priority <= 2 ? <span className="ml-2 text-xs font-semibold text-rose-600">PRIORITY</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">None — this window threads between scheduled movements.</p>}
        </div>
      </div>

      {/* overlap */}
      <div className="mb-6">
        <OverlapTimeline
          trains={trains.filter((t) => t.scheduled_time).map((t) => ({
            train_number: t.train_number, scheduled_time: t.scheduled_time, priority: t.priority,
            level: inWin(t.scheduled_time) ? 'recommended' : 'clear' as const,
          }))}
          requests={[]}
          windows={[{ start: block.start_time, end: block.end_time, recommended: true, label: `Window #${block.id}` }]}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-3">Comparative impact vs sibling candidates</h3>
        <ImpactTimeline windows={chartData} />
      </div>

      <RecommendationPanel
        reason={block.recommendation_reason || 'No backend explanation was stored for this window. Re-run the analysis from the Block Planner to generate one.'}
        confidence={block.priority_trains_affected === 0 ? 'HIGH' : 'MEDIUM'}
        onApprove={() => decide('approved')}
        onReject={() => decide('rejected')}
        busy={busy}
        decided={block.controller_decision}
      />
      {msg && <p className="mt-3 text-sm text-slate-600">{msg} <Link href="/decisions" className="font-medium text-primary-600 hover:underline">View in Decision History →</Link></p>}
      {block.controller_decision && (
        <p className="mt-3 text-sm text-slate-600">Controller decision: <span className="font-semibold text-slate-800">{block.controller_decision}</span> ({block.status})</p>
      )}
    </div>
  )
}
