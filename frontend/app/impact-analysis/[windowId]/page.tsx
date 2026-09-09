'use client'
import { use, useEffect, useState } from 'react'
import ImpactTimeline from '@/components/ImpactTimeline'
import RecommendationPanel from '@/components/RecommendationPanel'
import { api } from '@/lib/api'

export default function ImpactPage({ params }: { params: Promise<{ windowId: string }> }) {
  const { windowId } = use(params)
  const [block, setBlock] = useState<any>(null)
  const [siblings, setSiblings] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    fetch(`${base}/blocks/${windowId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b) {
          setBlock(b)
          return fetch(`${base}/blocks?section=${encodeURIComponent(b.section)}`).then((r) => r.json()).then(setSiblings).catch(() => setSiblings([b]))
        }
        // offline demo
        const demo = { id: Number(windowId), section: 'Bhadrak–Jajpur', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 2.5 * 3600e3).toISOString(), affected_trains: 6, priority_trains_affected: 0, conflicts: 0, tsr_required: false, estimated_delay: 42, impact_score: 8.4, status: 'candidate', recommendation_reason: 'Offline demo: lowest-impact morning window with zero priority trains affected.' }
        setBlock(demo)
        setSiblings([demo])
      })
      .catch(() => {})
  }, [windowId])

  const decide = async (decision: string) => {
    setBusy(true); setMsg('')
    try {
      const updated = await api.decide(Number(windowId), decision)
      setBlock(updated)
      setMsg(`Block ${decision} successfully.`)
    } catch (e: any) {
      setMsg(`Backend unreachable — decision recorded locally as ${decision}.`)
      setBlock((b: any) => b && ({ ...b, controller_decision: decision, status: decision }))
    } finally {
      setBusy(false)
    }
  }

  if (!block) return <p className="text-slate-500">Loading impact analysis…</p>

  const chartData = (siblings.length ? siblings : [block]).map((b: any) => ({
    affected_trains: b.affected_trains, priority_affected: b.priority_trains_affected,
    estimated_delay: b.estimated_delay, impact_score: b.impact_score,
  }))

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Impact Analysis — Window #{block.id}</h1>
      <p className="text-slate-500 mb-8">{block.section} · {new Date(block.start_time).toLocaleString('en-IN')} → {new Date(block.end_time).toLocaleString('en-IN')}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          ['Affected trains', block.affected_trains],
          ['Priority trains', block.priority_trains_affected],
          ['Est. delay (min)', block.estimated_delay],
          ['Impact score', block.impact_score],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="text-2xl font-bold text-slate-800">{v as string}</div>
            <div className="text-sm text-slate-500">{k as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/60 p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Comparative impact</h3>
        <ImpactTimeline windows={chartData} />
      </div>

      <RecommendationPanel
        reason={block.recommendation_reason || 'Morning window minimises passenger impact: fewest affected trains, no priority (Rajdhani/Duronto) crossings, no TSR, and lowest cascade delay.'}
        confidence={block.priority_trains_affected === 0 ? 'HIGH' : 'MEDIUM'}
        onApprove={() => decide('approved')}
        onReject={() => decide('rejected')}
        busy={busy}
      />
      {msg && <p className="mt-3 text-sm text-primary-700">{msg}</p>}
      {block.controller_decision && (
        <p className="mt-3 text-sm text-slate-600">Controller decision: <span className="font-semibold text-slate-800">{block.controller_decision}</span> ({block.status})</p>
      )}
    </div>
  )
}
