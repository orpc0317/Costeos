'use client'

import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UsuarioDialog } from './usuario-dialog'

export function NuevoUsuarioButton() {
  return (
    <UsuarioDialog
      trigger={
        <Button id="btn-nuevo-usuario">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      }
    />
  )
}
