import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarTiposCosteo } from '@/app/actions/tipos-costeo'
import { TiposCosteoClient } from './tipos-costeo-client'

export const metadata: Metadata = {
  title: 'Tipos de Costeo | Costeos',
  description: 'Gestión de tipos de costeo del sistema',
}

export default async function TiposCosteoPage() {
  // Obtenemos todos los tipos de costeo para que el DataTable del cliente los filtre
  const tiposCosteo = await listarTiposCosteo()

  return (
    <Suspense fallback={<div>Cargando tipos de costeo...</div>}>
      <TiposCosteoClient tiposCosteo={tiposCosteo} />
    </Suspense>
  )
}
