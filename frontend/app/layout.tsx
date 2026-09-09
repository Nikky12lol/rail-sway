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
  title: 'Rail-Sway · AI Maintenance Block Optimizer',
  description: 'AI-assisted railway block planning decision support',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-ink-950 font-sans text-slate-200">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto min-w-0">
            <div className="max-w-[1440px] mx-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
