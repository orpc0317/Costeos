'use client'

import { useEffect, useRef, useActionState, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { crearUsuario, editarUsuario } from '@/app/actions/usuarios'
import { ROLES } from '@/lib/permisos'
import type { UsuarioRow } from '@/lib/types/usuarios'

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene usuario, es edición; si no, es creación */
  usuario?: UsuarioRow | null
}

const ROLES_OPCIONES = [
  { value: ROLES.ADMIN,    label: 'Administrador' },
  { value: ROLES.MANAGER,  label: 'Manager' },
  { value: ROLES.ANALISTA, label: 'Analista' },
  { value: ROLES.VIEWER,   label: 'Viewer (Solo lectura)' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export function UsuarioDialog({ open, onOpenChange, usuario }: UsuarioDialogProps) {
  const isEditing = Boolean(usuario)
  const formRef = useRef<HTMLFormElement>(null)

  // Congelamos el estado inicial del usuario al abrir el modal
  // para evitar que Base UI se queje de que defaultValue cambió dinámicamente
  // (esto ocurre cuando la Server Action termina y Next.js refresca la data antes de cerrar el modal)
  const [initialUsuario, setInitialUsuario] = useState(usuario)
  
  useEffect(() => {
    if (open) {
      setInitialUsuario(usuario)
    }
  }, [open, usuario])

  // Bind la action con el id cuando editamos
  type ActionFn = (
    prev: { ok: boolean; error?: string; data?: unknown } | null,
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string; data?: unknown } | null>

  const action = (
    isEditing ? editarUsuario.bind(null, usuario!.id) : crearUsuario
  ) as ActionFn

  const [state, dispatch, isPending] = useActionState(action, null)

  // Reaccionar al resultado de la action
  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(isEditing ? 'Usuario actualizado' : 'Usuario creado')
      onOpenChange(false)
    } else {
      toast.error(state.error)
    }
  }, [state, isEditing, onOpenChange])

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!open) {
      formRef.current?.reset()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={dispatch} className="space-y-4 pt-2">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="u-nombre">Nombre completo</Label>
            <Input
              id="u-nombre"
              name="nombre"
              placeholder="Ej: Ana García"
              defaultValue={initialUsuario?.nombre ?? ''}
              required
              autoComplete="off"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Correo electrónico</Label>
            <Input
              id="u-email"
              name="email"
              type="email"
              placeholder="ana@empresa.com"
              defaultValue={initialUsuario?.email ?? ''}
              required
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="u-password">
              Contraseña
              {isEditing && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  (dejar vacío para no cambiar)
                </span>
              )}
            </Label>
            <Input
              id="u-password"
              name="password"
              type="password"
              placeholder={isEditing ? '••••••••' : 'Mínimo 8 caracteres'}
              required={!isEditing}
              autoComplete="new-password"
            />
          </div>

          {/* Rol */}
          <div className="space-y-1.5">
            <Label htmlFor="u-rol">Rol</Label>
            <Select name="rol" defaultValue={initialUsuario?.rol ?? ROLES.ANALISTA} required>
              <SelectTrigger id="u-rol">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_OPCIONES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Usuario ERP */}
          <div className="space-y-1.5">
            <Label htmlFor="u-erp">
              Usuario ERP
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                (ej: JPEREZ)
              </span>
            </Label>
            <Input
              id="u-erp"
              name="usuarioErp"
              placeholder="Nombre de usuario en el ERP"
              defaultValue={initialUsuario?.usuarioErp ?? ''}
              required
              autoComplete="off"
              className="uppercase"
              maxLength={10}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Referencia al usuario del ERP. No afecta las credenciales de acceso a esta app.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing ? 'Guardando…' : 'Creando…'
                : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
