'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings2, Users, Power, PowerOff, History, Pencil, Save } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { crearUsuario, editarUsuario, toggleActivo } from '@/app/actions/usuarios'
import { ROLES } from '@/lib/permisos'
import type { UsuarioRow } from '@/lib/types/usuarios'

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsuarioDialogProps {
  /** Si viene usuario, es edición/vista; si no, es creación */
  usuario?: UsuarioRow | null
  trigger: React.ReactElement
}

const ROLES_OPCIONES = [
  { value: ROLES.ADMIN,    label: 'Administrador' },
  { value: ROLES.MANAGER,  label: 'Manager' },
  { value: ROLES.ANALISTA, label: 'Analista' },
  { value: ROLES.VIEWER,   label: 'Viewer (Solo lectura)' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export function UsuarioDialog({ usuario, trigger }: UsuarioDialogProps) {
  const isExisting = !!usuario

  const [open, setOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  // mode: view (solo lectura), edit (edición), create (nuevo)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view')

  const [loading, setLoading] = useState(false)
  const [isPendingToggle, setIsPendingToggle] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('general')

  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [usuarioErp, setUsuarioErp] = useState('')
  const [rol, setRol] = useState<string>(ROLES.ANALISTA)

  // Versión congelada del usuario al abrir (para cancelar y para concurrencia)
  const [snapUsuario, setSnapUsuario] = useState<UsuarioRow | null>(null)

  // ── Inicialización al abrir (NUNCA en useEffect con deps de datos) ──────────
  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (newOpen) {
      // Inicializar todo aquí, no en useEffect
      setMode(isExisting ? 'view' : 'create')
      setNombre(usuario?.nombre ?? '')
      setEmail(usuario?.email ?? '')
      setUsuarioErp(usuario?.usuarioErp ?? '')
      setRol(usuario?.rol ?? ROLES.ANALISTA)
      setSnapUsuario(usuario ?? null)
      setGlobalError(null)
      setFieldErrors({})
      setActiveTab('general')
    }
  }

  function resetToView() {
    setNombre(snapUsuario?.nombre ?? '')
    setEmail(snapUsuario?.email ?? '')
    setUsuarioErp(snapUsuario?.usuarioErp ?? '')
    setRol(snapUsuario?.rol ?? ROLES.ANALISTA)
    setGlobalError(null)
    setFieldErrors({})
    setMode('view')
  }

  // ── Toggle Activo / Inactivo ───────────────────────────────────────────────
  async function handleToggle() {
    if (!usuario) return
    setIsPendingToggle(true)
    try {
      const result = await toggleActivo(usuario.id, snapUsuario!.registroVersion)
      if (result.ok) {
        toast.success(
          usuario.activo
            ? `${usuario.nombre} fue desactivado`
            : `${usuario.nombre} fue activado`,
        )
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsPendingToggle(false)
    }
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    // Validación frontend — NO limpiar fieldErrors existentes al inicio
    const localErrors: Record<string, string> = {}
    if (!nombre.trim()) localErrors.nombre = 'El nombre es requerido'
    if (!email.trim()) localErrors.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) localErrors.email = 'Correo inválido'
    if (!usuarioErp.trim()) localErrors.usuarioErp = 'El usuario ERP es requerido'
    if (!rol) localErrors.rol = 'El rol es requerido'

    // Combinar errores locales preservando los que ya existían de validaciones externas
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...localErrors }))
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('nombre', nombre)
    formData.append('email', email)
    formData.append('usuarioErp', usuarioErp)
    formData.append('rol', rol)

    if (mode === 'edit' && snapUsuario) {
      formData.append('registroVersion', String(snapUsuario.registroVersion))
    }

    try {
      let result
      if (mode === 'edit' && usuario) {
        result = await editarUsuario(usuario.id, null, formData)
      } else {
        result = await crearUsuario(null, formData)
      }

      if (result && !result.ok) {
        if (result.field) {
          // Error de campo del servidor — preservar otros fieldErrors
          setFieldErrors(prev => ({ ...prev, [result.field!]: result.error! }))
          setActiveTab('general')
          return
        }
        throw new Error(result.error)
      }

      toast.success(usuario ? 'Usuario actualizado' : 'Usuario creado')
      if (mode === 'edit') {
        // Refrescar el snap para que la versión local quede actualizada
        if (result?.data) setSnapUsuario(result.data as UsuarioRow)
        setMode('view')
      } else {
        setOpen(false)
      }
    } catch (err: any) {
      setGlobalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'create' ? 'Nuevo Usuario'
    : mode === 'edit'  ? 'Editar Usuario'
    : 'Detalles Usuario'

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger} />

        <DialogContent className="sm:max-w-[480px] h-[85vh] sm:h-[450px] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-slate-500" />
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Error global */}
          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md mb-2 border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col pt-2" noValidate>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Settings2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <TabsContent value="general" className="outline-none mt-0">
                  <div className="grid grid-cols-4 gap-x-6 gap-y-4">

                    {/* Nombre */}
                    <div className="flex flex-col gap-1.5 col-span-4">
                      <Label htmlFor="u-nombre">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-nombre"
                        placeholder="Ej: Ana García"
                        value={nombre}
                        autoComplete="off"
                        className="uppercase"
                        disabled={mode === 'view'}
                        aria-invalid={!!fieldErrors.nombre}
                        onChange={(e) => {
                          setNombre(normalizeText(e.target.value))
                          setFieldErrors(prev => { const n = { ...prev }; delete n.nombre; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.nombre} />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5 col-span-3">
                      <Label htmlFor="u-email">
                        Correo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-email"
                        type="email"
                        placeholder="ana@empresa.com"
                        value={email}
                        autoComplete="off"
                        className="lowercase"
                        disabled={mode === 'view'}
                        aria-invalid={!!fieldErrors.email}
                        onChange={(e) => {
                          setEmail(e.target.value.toLowerCase())
                          setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>

                    {/* Usuario ERP */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <Label htmlFor="u-erp">
                        Usuario ERP <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="u-erp"
                        placeholder="JPERE"
                        value={usuarioErp}
                        autoComplete="off"
                        className="uppercase"
                        maxLength={5}
                        disabled={mode === 'view'}
                        aria-invalid={!!fieldErrors.usuarioErp}
                        onChange={(e) => {
                          setUsuarioErp(normalizeText(e.target.value))
                          setFieldErrors(prev => { const n = { ...prev }; delete n.usuarioErp; return n })
                        }}
                      />
                      <FieldError message={fieldErrors.usuarioErp} />
                    </div>

                    {/* Rol */}
                    <div className="flex flex-col gap-1.5 col-span-4">
                      <Label htmlFor="u-rol">
                        Rol <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={rol}
                        onValueChange={(val) => {
                          setRol(val || '')
                          setFieldErrors(prev => { const n = { ...prev }; delete n.rol; return n })
                        }}
                        disabled={mode === 'view'}
                      >
                        <SelectTrigger id="u-rol" aria-invalid={!!fieldErrors.rol}>
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
                      <FieldError message={fieldErrors.rol} />
                    </div>

                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* ── Footer estándar ── */}
            <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
              {mode === 'view' ? (
                <>
                  {isExisting && (
                    <Button
                      type="button"
                      variant={usuario?.activo ? 'destructive' : 'default'}
                      className="mr-auto"
                      disabled={isPendingToggle}
                      onClick={handleToggle}
                    >
                      {usuario?.activo ? (
                        <><PowerOff className="mr-2 h-4 w-4" /> Desactivar</>
                      ) : (
                        <><Power className="mr-2 h-4 w-4" /> Activar</>
                      )}
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                      onClick={() => setHistorialOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 justify-end w-full">
                  {/* Cancelar solo en modo Editar (no en Crear) */}
                  {mode === 'edit' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetToView}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isExisting && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={usuario!.id}
          entidadTipo="Usuario"
          tabla="t_usuario"
        />
      )}
    </>
  )
}
