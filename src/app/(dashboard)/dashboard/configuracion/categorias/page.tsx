import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarCategorias } from '@/app/actions/categorias'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { CategoriasClient } from './categorias-client'

export const metadata: Metadata = {
  title: 'Categorias | Costeos',
  description: 'Gestión de categorías de ítems',
}

export default async function CategoriasPage() {
  const [initialData, permisos] = await Promise.all([
    listarCategorias(),
    getPermisosDetalle(PERMISOS.CAT_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando categorías...</div>}>
      <CategoriasClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
