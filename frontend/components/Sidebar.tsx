'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, BarChart3, History, Settings, Train } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/block-planner', label: 'Block Planner', Icon: Calendar },
  { href: '/impact-analysis/1', label: 'Impact Analysis', Icon: BarChart3 },
  { href: '/decisions', label: 'Decision History', Icon: History },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-primary-900 text-white p-4 flex flex-col shadow-xl">
      <div className="flex items-center gap-3 mb-10 px-1">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/50">
          <Train className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight">Rail‑Sway</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href.split('/').slice(0, 2).join('/')))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/25 text-white shadow-md shadow-primary-950/30 ring-1 ring-inset ring-primary-400/30'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white active:scale-[0.98]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          )
        })}
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>

      <div className="border-t border-white/10 pt-4 mt-2 text-xs text-slate-400">
        v1.1.0 · BHC–JJKR ·{' '}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>
    </aside>
  )
}
