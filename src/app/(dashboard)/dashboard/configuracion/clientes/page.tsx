import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarClientes } from '@/app/actions/clientes'
import { ClientesClient } from './clientes-client'

export const metadata: Metadata = {
  title: 'Clientes | Costeos',
  description: 'Gestión de clientes',
}

export default async function ClientesPage() {
  const clientes = await listarClientes()

  return (
    <Suspense fallback={<div>Cargando clientes...</div>}>
      <ClientesClient data={clientes} />
    </Suspense>
  )
}
