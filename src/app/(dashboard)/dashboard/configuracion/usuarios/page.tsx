import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listarUsuarios } from '@/app/actions/usuarios'
import { UsuariosClient } from './usuarios-client'

export const metadata: Metadata = {
  title: 'Usuarios | Costeos',
  description: 'Gestión de usuarios del sistema de costeos',
}

export default async function UsuariosPage() {
  // Obtenemos todos los usuarios para que el DataTable del cliente los filtre
  const usuarios = await listarUsuarios()

  return (
    <Suspense fallback={<div>Cargando usuarios...</div>}>
      <UsuariosClient usuarios={usuarios} />
    </Suspense>
  )
}
