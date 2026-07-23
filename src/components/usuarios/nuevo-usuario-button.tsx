'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UsuarioDialog } from './usuario-dialog'

export function NuevoUsuarioButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button id="btn-nuevo-usuario" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Nuevo usuario
      </Button>
      <UsuarioDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
