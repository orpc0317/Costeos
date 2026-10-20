import { Suspense } from 'react'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import type { Metadata } from 'next'
import { listarProveedores } from '@/app/actions/proveedores'
import { ProveedoresClient } from './proveedores-client'

export const metadata: Metadata = {
  title: 'Proveedores | Costeos',
  description: 'Gestión de proveedores',
}

export default async function ProveedoresPage() {
  const [initialData, permisos] = await Promise.all([
    listarProveedores({ limit: 50 }),
    getPermisosDetalle(PERMISOS.PRV_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando proveedores...</div>}>
      <ProveedoresClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
