import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarItems } from '@/app/actions/items'
import { listarCategorias } from '@/app/actions/categorias'
import { ItemsClient } from './items-client'

export const metadata: Metadata = {
  title: 'Items | Costeos',
  description: 'Gestión de ítems de costeo',
}

export default async function ItemsPage() {
  const [initialData, categorias] = await Promise.all([
    listarItems({ limit: 50 }),
    listarCategorias()
  ])

  return (
    <Suspense fallback={<div>Cargando ítems...</div>}>
      <ItemsClient initialData={initialData} categorias={categorias} />
    </Suspense>
  )
}
