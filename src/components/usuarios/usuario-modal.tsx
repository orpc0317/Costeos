'use client'

import { useState } from 'react'
import { useEditClick } from '@/lib/use-edit-click'
import { Users, Power, PowerOff, History, Pencil, Check, ShieldCheck, X } from 'lucide-react'
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
import { leerPermisosUsuario } from '@/app/actions/permisos'
import { UI_THEME } from '@/lib/theme'
import { MENUS, ROLES, presetDeRol, type PermisoFlags, type PermisosPantalla } from '@/lib/permisos'
import { MODULE_ACCENT } from '@/lib/ui-accent'
import { ModalHeading } from '@/components/ui/modal-heading'
import { SegmentCard, TwoColumns } from '@/components/ui/form-layout'
import { esConflicto } from '@/lib/conflicto'
import type { UsuarioRow } from '@/lib/types/usuarios'

function grillaDe(rol: string, guardadas?: PermisoFlags[]): PermisoFlags[] {
  if (guardadas && guardadas.length && guardadas.some((f) => !f.consultar || !f.agregar || !f.modificar || !f.eliminar)) {
    return MENUS.map((m) => guardadas.find((f) => f.indice === m.indice) ?? { indice: m.indice, consultar: false, agregar: false, modificar: false, eliminar: false })
  }
  if (rol === ROLES.ADMIN) {
    return MENUS.map((m) => ({ indice: m.indice, consultar: true, agregar: true, modificar: true, eliminar: true }))
  }
  const preset = presetDeRol(rol)
  return MENUS.map((m) => preset.find((f) => f.indice === m.indice) ?? { indice: m.indice, consultar: false, agregar: false, modificar: false, eliminar: false })
}

interface UsuarioModalProps {
  usuario?: UsuarioRow
  trigger?: React.ReactNode
  onSuccess?: () => void
  permisos?: PermisosPantalla
}

const ROLES_OPCIONES = [
  { value: ROLES.ADMIN,    label: 'Administrador' },
  { value: ROLES.MANAGER,  label: 'Manager' },
  { value: ROLES.ANALISTA, label: 'Analista' },
  { value: ROLES.VIEWER,   label: 'Viewer' },
].sort((a, b) => a.label.localeCompare(b.label))

export function UsuarioModal({ usuario, trigger, onSuccess, permisos }: UsuarioModalProps) {
  const puedeEditar = permisos?.modificar !== false
  const isEditing = !!usuario
  const [open, setOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const { onEditMouseDown, onEditClick, blockAccidentalSubmit } = useEditClick(setMode)
  const [loading, setLoading] = useState(false)
  const [isPendingToggle, setIsPendingToggle] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('general')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [usuarioErp, setUsuarioErp] = useState('')
  const [rol, setRol] = useState<string>(ROLES.ANALISTA)
  const [flags, setFlags] = useState<PermisoFlags[]>(() => grillaDe(ROLES.ANALISTA))
  const [snapUsuario, setSnapUsuario] = useState<UsuarioRow | null>(null)

  function resetFields(data?: UsuarioRow | null) {
    setNombre(data?.nombre ?? '')
    setEmail(data?.email ?? '')
    setUsuarioErp(data?.usuarioErp ?? '')
    const nextRol = data?.rol ?? ROLES.ANALISTA
    setRol(nextRol)
    setFlags(grillaDe(nextRol))
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen && esConflicto(globalError)) onSuccess?.()
    if (newOpen) {
      resetFields(usuario)
      setSnapUsuario(usuario ?? null)
      setMode(isEditing ? 'view' : 'edit')
      if (usuario) {
        leerPermisosUsuario(usuario.id).then((rows) => {
          const restringido = rows.some((f) => !f.consultar || !f.agregar || !f.modificar || !f.eliminar)
          setFlags(restringido ? rows : grillaDe(usuario.rol, rows))
        })
      }
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
    if (blockAccidentalSubmit(e)) return
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
    const todoActivo = flags.every((f) => f.consultar && f.agregar && f.modificar && f.eliminar)
    formData.append('permisos', JSON.stringify(rol === ROLES.ADMIN && todoActivo ? [] : flags))
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
        <DialogContent className={UI_THEME.modal.contentWide}>
          <ModalHeading
            accent={MODULE_ACCENT.usuarios}
            icon={Users}
            mode={!isEditing ? 'create' : mode === 'edit' ? 'edit' : 'view'}
            title={title}
            subtitle={usuario ? usuario.email : null}
          />

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
                <TabsTrigger value="permisos">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Permisos
                </TabsTrigger>
              </TabsList>

              <div className={UI_THEME.modal.scrollArea}>
                <TabsContent value="general" className="mt-0">
                  <TwoColumns
                    left={<SegmentCard label="Identificacion">
                  <div className="col-span-2 grid grid-cols-2 gap-2">
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

                    </div>
                    </SegmentCard>}
                    right={<SegmentCard label="Acceso">
                    <div className="col-span-2 grid gap-2">
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
                          setFlags(grillaDe(val))
                          setFieldErrors(prev => { const n = { ...prev }; delete n.rol; return n })
                        }}
                        disabled={mode === 'view'}
                        viewMode={mode === 'view'}
                        searchable={false}
                        error={!!fieldErrors.rol}
                        placeholder="Seleccionar rol"
                      />
                      <FieldError message={fieldErrors.rol} />
                    </div>
                    </div>
                    </SegmentCard>}
                  />
                </TabsContent>
                <TabsContent value="permisos" className="mt-0">
                  <SegmentCard label="Pantallas">
                    <div className="col-span-2 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="py-1 pr-2 font-semibold" style={{ fontSize: 'var(--ui-form-label)' }}>Pantalla</th>
                            {(['consultar', 'agregar', 'modificar', 'eliminar'] as const).map((op) => (
                              <th key={op} className="px-2 py-1 text-center font-semibold capitalize" style={{ fontSize: 'var(--ui-form-label)' }}>{op}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {MENUS.map((menu) => {
                            const flag = flags.find((f) => f.indice === menu.indice)
                            return (
                              <tr key={menu.indice} className="border-t border-border/50">
                                <td className="py-1 pr-2 text-sm">{menu.nombre}</td>
                                {(['consultar', 'agregar', 'modificar', 'eliminar'] as const).map((op) => (
                                  <td key={op} className="px-2 py-1 text-center">
                                    <input
                                      type="checkbox"
                                      checked={!!flag?.[op]}
                                      disabled={mode === 'view'}
                                      onChange={(e) => {
                                        setFlags((prev) => prev.map((f) => f.indice === menu.indice ? { ...f, [op]: e.target.checked } : f))
                                      }}
                                    />
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </SegmentCard>
                </TabsContent>
              </div>
            </Tabs>

            <div className={UI_THEME.modal.footer}>
              {mode === 'view' ? (
                <div className={UI_THEME.modal.buttons.viewRow}>
                  <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.usuarios.hover} onClick={() => setHistorialOpen(true)}>
                    <History className={UI_THEME.modal.buttons.icon} /> Historial
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="ghost" size="sm" className={usuario?.activo ? UI_THEME.modal.buttons.eliminar : MODULE_ACCENT.usuarios.hover} disabled={isPendingToggle} onClick={handleToggle}>
                      {usuario?.activo
                        ? <><PowerOff className={UI_THEME.modal.buttons.icon} />Desactivar</>
                        : <><Power className={UI_THEME.modal.buttons.icon} />Activar</>}
                    </Button>
                  )}
                  {puedeEditar && (
                    <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.usuarios.hover} onMouseDown={onEditMouseDown} onClick={onEditClick}>
                      <Pencil className={UI_THEME.modal.buttons.icon} /> Editar
                    </Button>
                  )}
                </div>
              ) : isEditing ? (
                <div className={UI_THEME.modal.buttons.editRow}>
                  <Button type="button" variant="ghost" size="sm" className={MODULE_ACCENT.usuarios.hover} onClick={resetToView} disabled={loading}>
                    <X className={UI_THEME.modal.buttons.icon} /> Cancelar
                  </Button>
                  <Button type="submit" variant="ghost" size="sm" className={MODULE_ACCENT.usuarios.hover} disabled={loading}>
                    <Check className={UI_THEME.modal.buttons.icon} /> {loading ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              ) : (
                <div className={UI_THEME.modal.buttons.editRow}>
                  <Button type="submit" variant="ghost" size="sm" className={MODULE_ACCENT.usuarios.hover} disabled={loading}>
                    <Check className={UI_THEME.modal.buttons.icon} /> {loading ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              )}
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
