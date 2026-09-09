'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, TableProperties, Calendar,
  BarChart3, History, Settings, Train,
} from 'lucide-react'

const groups = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Overview', Icon: LayoutDashboard },
      { href: '/maintenance', label: 'Requests', Icon: ClipboardList },
      { href: '/timetable', label: 'Timetable', Icon: TableProperties },
      { href: '/block-planner', label: 'AI Planner', Icon: Calendar },
      { href: '/impact-analysis/1', label: 'Impact Analysis', Icon: BarChart3 },
      { href: '/decisions', label: 'Decisions', Icon: History },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', Icon: Settings }],
  },
]

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href.startsWith('/impact-analysis')) return pathname.startsWith('/impact-analysis')
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-900 border-r border-white/10 px-3 py-5 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-950/60">
          <Train className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight text-white leading-tight">Rail-Sway</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Block Optimizer</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? 'bg-primary-500/20 text-white ring-1 ring-inset ring-primary-400/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 active:scale-[0.99]'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="font-medium">{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400"></span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-3 mt-2 px-2 text-[11px] text-slate-500">
        v2.0 · BHC–JJKR ·{' '}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          Demo data
        </span>
      </div>
    </aside>
  )
}
