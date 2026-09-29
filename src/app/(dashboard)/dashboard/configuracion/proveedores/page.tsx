import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarProveedores } from '@/app/actions/proveedores'
import { ProveedoresClient } from './proveedores-client'

export const metadata: Metadata = {
  title: 'Proveedores | Costeos',
  description: 'Gestión de proveedores',
}

export default async function ProveedoresPage() {
  const proveedores = await listarProveedores()

  return (
    <Suspense fallback={<div>Cargando proveedores...</div>}>
      <ProveedoresClient data={proveedores} />
    </Suspense>
  )
}
