import { Suspense } from 'react'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import type { Metadata } from 'next'
import { listarTiposCosteo } from '@/app/actions/tipos-costeo'
import { TiposCosteoClient } from './tipos-costeo-client'

export const metadata: Metadata = {
  title: 'Tipos de Costeo | Costeos',
  description: 'Gestión de tipos de costeo del sistema',
}

export default async function TiposCosteoPage() {
  const [initialData, permisos] = await Promise.all([
    listarTiposCosteo(),
    getPermisosDetalle(PERMISOS.TCO_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando tipos de costeo...</div>}>
      <TiposCosteoClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
