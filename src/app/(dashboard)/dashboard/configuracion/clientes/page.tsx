import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarClientes } from '@/app/actions/clientes'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { ClientesClient } from './clientes-client'

export const metadata: Metadata = {
  title: 'Clientes | Costeos',
  description: 'Gestión de clientes',
}

export default async function ClientesPage() {
  const [initialData, permisos] = await Promise.all([
    listarClientes({ limit: 50 }),
    getPermisosDetalle(PERMISOS.CLI_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando clientes...</div>}>
      <ClientesClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
