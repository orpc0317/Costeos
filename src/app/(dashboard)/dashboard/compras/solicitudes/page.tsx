// src/app/(dashboard)/dashboard/compras/solicitudes/page.tsx
import { listarSolicitudes } from '@/app/actions/solicitudes'
import { SolicitudesClient } from './solicitudes-client'

export const dynamic = 'force-dynamic'

export default async function SolicitudesPage() {
  const solicitudes = await listarSolicitudes()
  return <SolicitudesClient solicitudes={solicitudes} />
}
