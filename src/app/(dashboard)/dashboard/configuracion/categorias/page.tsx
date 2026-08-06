import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarCategorias } from '@/app/actions/categorias'
import { CategoriasClient } from './categorias-client'

export const metadata: Metadata = {
  title: 'Categorías | Costeos',
  description: 'Gestión de categorías de ítems',
}

export default async function CategoriasPage() {
  const categorias = await listarCategorias()

  return (
    <Suspense fallback={<div>Cargando categorías...</div>}>
      <CategoriasClient data={categorias} />
    </Suspense>
  )
}
