'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UsuarioDialog } from './usuario-dialog'
import type { UsuarioRow } from '@/lib/types/usuarios'

interface UsuarioAccionesProps {
  usuario: UsuarioRow
}

export function UsuarioAcciones({ usuario }: UsuarioAccionesProps) {
  return (
    <UsuarioDialog
      usuario={usuario}
      trigger={
        <Button variant="ghost" size="icon" title="Ver detalles">
          <Eye className="h-4 w-4 text-blue-600" />
        </Button>
      }
    />
  )
}
