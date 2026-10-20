import { Suspense } from 'react'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import type { Metadata } from 'next'
import { listarTiposCombo } from '@/app/actions/tipos-combo'
import { TiposComboClient } from './tipos-combo-client'

export const metadata: Metadata = {
  title: 'Tipos Combo | Costeos',
  description: 'Gestión de tipos de combo del sistema',
}

export default async function TiposComboPage() {
  const [initialData, permisos] = await Promise.all([
    listarTiposCombo(),
    getPermisosDetalle(PERMISOS.TCB_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando tipos combo...</div>}>
      <TiposComboClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
