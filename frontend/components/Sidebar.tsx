import Link from 'next/link'
import { LayoutDashboard, Calendar, BarChart3, History, Settings, Train } from 'lucide-react'

const links = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/block-planner', label: 'Block Planner', Icon: Calendar },
  { href: '/impact-analysis/1', label: 'Impact Analysis', Icon: BarChart3 },
  { href: '/decisions', label: 'Decision History', Icon: History },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <Train className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Rail‑Sway</span>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-teal-700">
            <Icon className="w-5 h-5" /> {label}
          </Link>
        ))}
        <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
          <Settings className="w-5 h-5" /> Settings
        </Link>
      </nav>
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
        v1.0.0 · Corridor: BHC–JJKR
      </div>
    </aside>
  )
}
