import { Suspense } from 'react'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import type { Metadata } from 'next'
import { getEmpresas } from '@/app/actions/empresas'
import { EmpresasClient } from './empresas-client'

export const metadata: Metadata = {
  title: 'Empresas | Costeos',
  description: 'Gestión de empresas y sincronización ERP',
}

export default async function EmpresasPage() {
  const [initialData, permisos] = await Promise.all([
    getEmpresas(),
    getPermisosDetalle(PERMISOS.EMP_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando empresas...</div>}>
      <EmpresasClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
