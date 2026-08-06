import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarItems } from '@/app/actions/items'
import { listarCategorias } from '@/app/actions/categorias'
import { ItemsClient } from './items-client'

export const metadata: Metadata = {
  title: 'Ítems | Costeos',
  description: 'Gestión de ítems de costeo',
}

export default async function ItemsPage() {
  const [items, categorias] = await Promise.all([
    listarItems(),
    listarCategorias()
  ])

  return (
    <Suspense fallback={<div>Cargando ítems...</div>}>
      <ItemsClient data={items} categorias={categorias} />
    </Suspense>
  )
}
