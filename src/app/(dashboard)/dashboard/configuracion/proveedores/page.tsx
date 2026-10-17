import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarProveedores } from '@/app/actions/proveedores'
import { ProveedoresClient } from './proveedores-client'

export const metadata: Metadata = {
  title: 'Proveedores | Costeos',
  description: 'Gestión de proveedores',
}

export default async function ProveedoresPage() {
  const initialData = await listarProveedores({ limit: 50 })
  return (
    <Suspense fallback={<div>Cargando proveedores...</div>}>
      <ProveedoresClient initialData={initialData} />
    </Suspense>
  )
}
