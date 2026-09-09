'use client'

export type Metric = { label: string; value: string | number; sub?: string; accent?: boolean }

/** Compact operational metric strip — values only, no decoration. */
export default function MetricStrip({ items }: { items: Metric[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900 divide-x divide-white/10 grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((m) => (
        <div key={m.label} className="px-5 py-4 min-w-0">
          <div className={`text-2xl font-bold tabular-nums tracking-tight truncate ${m.accent ? 'text-emerald-300' : 'text-slate-100'}`}>
            {m.value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mt-0.5 truncate">{m.label}</div>
          {m.sub && <div className="text-xs text-slate-500 mt-0.5 truncate">{m.sub}</div>}
        </div>
      ))}
    </div>
  )
}
