'use client'

import { useState } from 'react'
import { Users, Power, PowerOff, History, Pencil, Save } from 'lucide-react'
import { normalizeText } from '@/lib/utils/text'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field-error'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { crearUsuario, editarUsuario, toggleActivo } from '@/app/actions/usuarios'
import { UI_THEME } from '@/lib/theme'
import { ROLES } from '@/lib/permisos'
import type { UsuarioRow } from '@/lib/types/usuarios'

interface UsuarioModalProps {
  usuario?: UsuarioRow
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const ROLES_OPCIONES = [
  { value: ROLES.ADMIN,    label: 'Administrador' },
  { value: ROLES.MANAGER,  label: 'Manager' },
  { value: ROLES.ANALISTA, label: 'Analista' },
  { value: ROLES.VIEWER,   label: 'Viewer' },
].sort((a, b) => a.label.localeCompare(b.label))

export function UsuarioModal({ usuario, trigger, onSuccess }: UsuarioModalProps) {
  const isEditing = !!usuario
  const [open, setOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [loading, setLoading] = useState(false)
  const [isPendingToggle, setIsPendingToggle] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('general')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [usuarioErp, setUsuarioErp] = useState('')
  const [rol, setRol] = useState<string>(ROLES.ANALISTA)
  const [snapUsuario, setSnapUsuario] = useState<UsuarioRow | null>(null)

  function resetFields(data?: UsuarioRow | null) {
    setNombre(data?.nombre ?? '')
    setEmail(data?.email ?? '')
    setUsuarioErp(data?.usuarioErp ?? '')
    setRol(data?.rol ?? ROLES.ANALISTA)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      resetFields(usuario)
      setSnapUsuario(usuario ?? null)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  function resetToView() {
    resetFields(snapUsuario)
    setMode('view')
  }

  async function handleToggle() {
    if (!usuario) return
    setIsPendingToggle(true)
    try {
      const result = await toggleActivo(usuario.id, snapUsuario!.registroVersion)
      if (result.ok) {
        setOpen(false)
        onSuccess?.()
      } else {
        setGlobalError(result.error ?? 'Error al cambiar estado')
      }
    } finally {
      setIsPendingToggle(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    const localErrors: Record<string, string> = {}
    if (!nombre.trim()) localErrors.nombre = 'El nombre es requerido'
    if (!email.trim()) localErrors.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) localErrors.email = 'Correo inválido'
    if (!usuarioErp.trim()) localErrors.usuarioErp = 'El usuario ERP es requerido'
    if (!rol) localErrors.rol = 'El rol es requerido'

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...localErrors }))
      setActiveTab('general')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('nombre', nombre)
    formData.append('email', email)
    formData.append('usuarioErp', usuarioErp)
    formData.append('rol', rol)
    if (isEditing && snapUsuario) {
      formData.append('registroVersion', String(snapUsuario.registroVersion))
    }

    try {
      const result = isEditing && usuario
        ? await editarUsuario(usuario.id, null, formData)
        : await crearUsuario(null, formData)

      if (result && !result.ok) {
        if (result.field) {
          setFieldErrors(prev => ({ ...prev, [result.field!]: result.error! }))
          setActiveTab('general')
          return
        }
        setGlobalError(result.error)
        return
      }

      if (isEditing) {
        if (result?.ok && result.data) setSnapUsuario(result.data as UsuarioRow)
        setMode('view')
      } else {
        setOpen(false)
      }
      onSuccess?.()
    } catch {
      setGlobalError('Error inesperado del servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const title = !isEditing
    ? 'Nuevo Usuario'
    : mode === 'edit' ? 'Editar Usuario' : 'Detalle Usuario'

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
        <DialogContent className="sm:max-w-[480px] h-[85vh] sm:h-[450px] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className={UI_THEME.modal.title}>
              <Users className="w-5 h-5 text-slate-500" />
              {title}
            </DialogTitle>
          </DialogHeader>

          {globalError && (
            <div className={UI_THEME.forms.globalError}>{globalError}</div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col pt-2" noValidate>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className={UI_THEME.tabs.listClass}>
                <TabsTrigger value="general">
                  <Users className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className={UI_THEME.modal.scrollArea}>
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                    <div className="flex flex-col gap-1.5 col-span-4">
                      <Label htmlFor="u-nombre" className={UI_THEME.forms.labelBase}>
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-nombre"
                        value={nombre}
                        autoComplete="off"
                        className={`${UI_THEME.forms.inputBase} uppercase`}
                        disabled={mode === 'view'}
                        data-view-mode={mode === 'view'}
                        aria-invalid={!!fieldErrors.nombre}
                        onChange={(e) => {
                          setNombre(normalizeText(e.target.value))
                          setFieldErrors(prev => { const n = { ...prev }; delete n.nombre; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.nombre} />
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-3">
                      <Label htmlFor="u-email" className={UI_THEME.forms.labelBase}>
                        Correo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-email"
                        type="email"
                        value={email}
                        autoComplete="off"
                        className={`${UI_THEME.forms.inputBase} lowercase`}
                        disabled={mode === 'view'}
                        data-view-mode={mode === 'view'}
                        aria-invalid={!!fieldErrors.email}
                        onChange={(e) => {
                          setEmail(e.target.value.toLowerCase())
                          setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-1">
                      <Label htmlFor="u-erp" className={UI_THEME.forms.labelBase}>
                        Usuario ERP <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-erp"
                        value={usuarioErp}
                        autoComplete="off"
                        className={`${UI_THEME.forms.inputBase} uppercase`}
                        maxLength={5}
                        disabled={mode === 'view'}
                        data-view-mode={mode === 'view'}
                        aria-invalid={!!fieldErrors.usuarioErp}
                        onChange={(e) => {
                          setUsuarioErp(normalizeText(e.target.value))
                          setFieldErrors(prev => { const n = { ...prev }; delete n.usuarioErp; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.usuarioErp} />
                    </div>

                    <div className="flex flex-col gap-1.5 col-span-4">
                      <Label htmlFor="u-rol" className={UI_THEME.forms.labelBase}>
                        Rol <span className="text-red-500">*</span>
                      </Label>
                      <SearchableSelect
                        id="u-rol"
                        options={ROLES_OPCIONES}
                        value={rol}
                        onChange={(val) => {
                          setRol(val)
                          setFieldErrors(prev => { const n = { ...prev }; delete n.rol; return n })
                        }}
                        disabled={mode === 'view'}
                        searchable={false}
                        error={!!fieldErrors.rol}
                        placeholder="Seleccionar rol"
                      />
                      <FieldError message={fieldErrors.rol} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className={UI_THEME.modal.footer}>
              <div>
                {mode === 'view' && isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    className={usuario?.activo ? UI_THEME.modal.buttons.eliminar : undefined}
                    disabled={isPendingToggle}
                    onClick={handleToggle}
                  >
                    {usuario?.activo
                      ? <><PowerOff className="mr-2 h-4 w-4" />Desactivar</>
                      : <><Power className="mr-2 h-4 w-4" />Activar</>}
                  </Button>
                )}
              </div>
              <div className={UI_THEME.modal.buttons.rightGroup}>
                {mode === 'view' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className={UI_THEME.modal.buttons.historial}
                      onClick={() => setHistorialOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Historial
                    </Button>
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </>
                )}
                {mode === 'edit' && (
                  <>
                    {isEditing && (
                      <Button type="button" variant="outline" onClick={resetToView} disabled={loading}>
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {usuario && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={usuario.id}
          entidadTipo="Usuario"
          tabla="t_usuario"
        />
      )}
    </>
  )
}
