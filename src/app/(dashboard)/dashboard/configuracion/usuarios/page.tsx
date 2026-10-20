import { Suspense } from 'react'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import type { Metadata } from 'next'
import { listarUsuarios } from '@/app/actions/usuarios'
import { UsuariosClient } from './usuarios-client'

export const metadata: Metadata = {
  title: 'Usuarios | Costeos',
  description: 'Gestión de usuarios del sistema de costeos',
}

export default async function UsuariosPage() {
  const [initialData, permisos] = await Promise.all([
    listarUsuarios(),
    getPermisosDetalle(PERMISOS.USU_CAT),
  ])
  return (
    <Suspense fallback={<div>Cargando usuarios...</div>}>
      <UsuariosClient initialData={initialData} permisos={permisos} />
    </Suspense>
  )
}
