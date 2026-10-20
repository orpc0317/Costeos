// src/app/(dashboard)/dashboard/compras/solicitudes/page.tsx
import { listarSolicitudes } from '@/app/actions/solicitudes'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { SolicitudesClient } from './solicitudes-client'

export const dynamic = 'force-dynamic'

export default async function SolicitudesPage() {
  const [solicitudes, permisos] = await Promise.all([
    listarSolicitudes(),
    getPermisosDetalle(PERMISOS.SOL_COM),
  ])
  return <SolicitudesClient solicitudes={solicitudes} permisos={permisos} />
}
