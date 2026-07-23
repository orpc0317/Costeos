import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-full">
      {/* Sidebar fijo */}
      <AppSidebar user={session.user} />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
