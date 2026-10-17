import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarTiposCombo } from '@/app/actions/tipos-combo'
import { TiposComboClient } from './tipos-combo-client'

export const metadata: Metadata = {
  title: 'Tipos Combo | Costeos',
  description: 'Gestión de tipos de combo del sistema',
}

export default async function TiposComboPage() {
  const initialData = await listarTiposCombo()
  return (
    <Suspense fallback={<div>Cargando tipos combo...</div>}>
      <TiposComboClient initialData={initialData} />
    </Suspense>
  )
}
