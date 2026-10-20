import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarItems } from '@/app/actions/items'
import { listarCategorias } from '@/app/actions/categorias'
import { ItemsClient } from './items-client'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'

export const metadata: Metadata = {
  title: 'Items | Costeos',
  description: 'Gestión de ítems de costeo',
}

export default async function ItemsPage() {
  const [initialData, categorias, permisos] = await Promise.all([
    listarItems({ limit: 50 }),
    listarCategorias(),
    getPermisosDetalle(PERMISOS.ITE_CAT),
  ])

  return (
    <Suspense fallback={<div>Cargando ítems...</div>}>
      <ItemsClient initialData={initialData} categorias={categorias} permisos={permisos} />
    </Suspense>
  )
}
