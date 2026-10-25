import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getPermisosUsuario } from '@/app/actions/permisos'
import { PortadaClient } from './portada-client'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [session, permisos] = await Promise.all([auth(), getPermisosUsuario()])
  const nombre = session?.user?.name?.split(' ')[0] ?? 'Usuario'

  return <PortadaClient nombre={nombre} permisos={permisos} />
}
