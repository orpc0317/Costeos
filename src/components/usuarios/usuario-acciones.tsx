'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, PowerOff, Power } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { UsuarioDialog } from './usuario-dialog'
import { toggleActivo } from '@/app/actions/usuarios'
import type { UsuarioRow } from '@/lib/types/usuarios'

interface UsuarioAccionesProps {
  usuario: UsuarioRow
}

export function UsuarioAcciones({ usuario }: UsuarioAccionesProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleActivo(usuario.id)
      if (result.ok) {
        toast.success(
          usuario.activo
            ? `${usuario.nombre} fue desactivado`
            : `${usuario.nombre} fue activado`,
        )
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isPending}
              aria-label={`Acciones para ${usuario.nombre}`}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleToggle}
            className={usuario.activo ? 'text-destructive focus:text-destructive' : ''}
          >
            {usuario.activo ? (
              <>
                <PowerOff className="mr-2 h-3.5 w-3.5" />
                Desactivar
              </>
            ) : (
              <>
                <Power className="mr-2 h-3.5 w-3.5" />
                Activar
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UsuarioDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        usuario={usuario}
      />
    </>
  )
}
