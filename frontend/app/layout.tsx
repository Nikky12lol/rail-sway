import '../styles/globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata = { title: 'Rail-Sway', description: 'AI-assisted railway block planning' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  )
}
