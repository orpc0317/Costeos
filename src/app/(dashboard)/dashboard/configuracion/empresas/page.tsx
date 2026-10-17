import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getEmpresas } from '@/app/actions/empresas'
import { EmpresasClient } from './empresas-client'

export const metadata: Metadata = {
  title: 'Empresas | Costeos',
  description: 'Gestión de empresas y sincronización ERP',
}

export default async function EmpresasPage() {
  const initialData = await getEmpresas()
  return (
    <Suspense fallback={<div>Cargando empresas...</div>}>
      <EmpresasClient initialData={initialData} />
    </Suspense>
  )
}
