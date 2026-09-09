import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import '../styles/globals.css'
import Sidebar from '@/components/Sidebar'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Rail-Sway',
  description: 'Intelligent Maintenance Coordination',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-slate-50 font-sans text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-8 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  )
}
