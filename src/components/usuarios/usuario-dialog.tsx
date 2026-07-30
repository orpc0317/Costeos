'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Settings2, Users, Power, PowerOff, History, Pencil } from 'lucide-react'
import { normalizeText } from '@/lib/utils/text'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { crearUsuario, editarUsuario, toggleActivo } from '@/app/actions/usuarios'
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
  const [historialOpen, setHistorialOpen] = useState(false)

  // Congelamos el estado inicial del usuario al abrir el modal
  // para evitar que Base UI se queje de que defaultValue cambió dinámicamente
  // (esto ocurre cuando la Server Action termina y Next.js refresca la data antes de cerrar el modal)
  const [initialUsuario, setInitialUsuario] = useState(usuario)
  
  // mode: view (solo lectura), edit (edición), create (nuevo)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(usuario ? 'view' : 'create')
  
  const [isPendingToggle, startTransitionToggle] = useTransition()

  function handleToggle() {
    if (!usuario) return
    startTransitionToggle(async () => {
      const result = await toggleActivo(usuario.id, usuario.registroVersion)
      if (result.ok) {
        toast.success(
          usuario.activo
            ? `${usuario.nombre} fue desactivado`
            : `${usuario.nombre} fue activado`,
        )
        onOpenChange(false) // cerramos el modal o mantenemos abierto? Cerremos por limpieza.
      } else {
        toast.error(result.error)
      }
    })
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('general')
  const [nombre, setNombre] = useState(initialUsuario?.nombre ?? '')
  const [email, setEmail] = useState(initialUsuario?.email ?? '')
  const [usuarioErp, setUsuarioErp] = useState(initialUsuario?.usuarioErp ?? '')
  const [rol, setRol] = useState(initialUsuario?.rol ?? ROLES.ANALISTA)

  useEffect(() => {
    if (open) {
      setInitialUsuario(usuario ?? null)
      setMode(usuario ? 'view' : 'create')
      setNombre(usuario?.nombre ?? '')
      setEmail(usuario?.email ?? '')
      setUsuarioErp(usuario?.usuarioErp ?? '')
      setRol(usuario?.rol ?? ROLES.ANALISTA)
      setError(null)
      setFieldErrors({})
      setActiveTab('general')
    }
  }, [open, usuario])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    const formData = new FormData()
    formData.append('nombre', nombre)
    formData.append('email', email)
    formData.append('usuarioErp', usuarioErp)
    formData.append('rol', rol)
    
    if (mode === 'edit' && usuario) {
      formData.append('registroVersion', String(usuario.registroVersion))
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
          setActiveTab('general')
          setTimeout(() => {
            let elementId = `u-${result.field}`
            if (result.field === 'usuarioErp') elementId = 'u-erp'

            const el = document.getElementById(elementId) as HTMLInputElement | HTMLButtonElement
            if (el) {
              el.focus()
            }
          }, 100)

          setFieldErrors({ [result.field]: result.error })
          setLoading(false)
          return
        }
        
        throw new Error(result.error)
      }

      toast.success(usuario ? 'Usuario actualizado' : 'Usuario creado')
      if (mode === 'edit') {
        if (result?.data) {
          setInitialUsuario(result.data as any)
        }
        setMode('view')
      } else {
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            {mode === 'create' ? 'Nuevo Usuario' : mode === 'edit' ? 'Editar Usuario' : 'Detalles de Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="pt-2" noValidate>
          {error && <div className="text-red-500 text-sm font-medium mb-4">{error}</div>}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList variant="line" className="mb-4">
              <TabsTrigger value="general">
                <Settings2 className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="outline-none mt-0">
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                {/* Nombre */}
                <div className="space-y-1.5 col-span-4">
                  <Label htmlFor="u-nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="u-nombre"
                    name="nombre"
                    placeholder="Ej: Ana García"
                    value={nombre}
                    required
                    autoComplete="off"
                    className="uppercase"
                    disabled={mode === 'view'}
                    aria-invalid={!!fieldErrors.nombre}
                    data-view-mode={mode === 'view'}
                    onChange={(e) => {
                      setNombre(normalizeText(e.target.value))
                      e.target.setCustomValidity('')
                      setFieldErrors(prev => ({ ...prev, nombre: '' }))
                    }}
                    onInvalid={(e) => {
                      if ((e.target as HTMLInputElement).validity.valueMissing) {
                        (e.target as HTMLInputElement).setCustomValidity('El nombre es requerido')
                      }
                    }}
                  />
                  {fieldErrors.nombre && <p className="text-xs text-red-500 mt-1">{fieldErrors.nombre}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="u-email">
                    Correo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="u-email"
                    name="email"
                    type="email"
                    placeholder="ana@empresa.com"
                    value={email}
                    required
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                    autoComplete="off"
                    className="lowercase"
                    disabled={mode === 'view'}
                    aria-invalid={!!fieldErrors.email}
                    data-view-mode={mode === 'view'}
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase())
                      e.target.setCustomValidity('')
                      setFieldErrors(prev => ({ ...prev, email: '' }))
                    }}
                    onInvalid={(e) => {
                      const target = e.target as HTMLInputElement
                      if (target.validity.valueMissing) {
                        target.setCustomValidity('El correo es requerido')
                      } else if (target.validity.typeMismatch || target.validity.patternMismatch) {
                        target.setCustomValidity('Correo electrónico inválido')
                      }
                    }}
                  />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>

                {/* Usuario ERP */}
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="u-erp">
                    Usuario ERP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="u-erp"
                    name="usuarioErp"
                    placeholder="Ej: JPERE"
                    value={usuarioErp}
                    required
                    autoComplete="off"
                    className="uppercase"
                    maxLength={5}
                    disabled={mode === 'view'}
                    aria-invalid={!!fieldErrors.usuarioErp}
                    data-view-mode={mode === 'view'}
                    onChange={(e) => {
                      setUsuarioErp(normalizeText(e.target.value))
                      e.target.setCustomValidity('')
                      setFieldErrors(prev => ({ ...prev, usuarioErp: '' }))
                    }}
                    onInvalid={(e) => {
                      if ((e.target as HTMLInputElement).validity.valueMissing) {
                        (e.target as HTMLInputElement).setCustomValidity('El usuario ERP es requerido')
                      }
                    }}
                  />
                  {fieldErrors.usuarioErp && <p className="text-xs text-red-500 mt-1">{fieldErrors.usuarioErp}</p>}
                </div>

                {/* Rol */}
                <div className="space-y-1.5 col-span-4">
                  <Label htmlFor="u-rol">
                    Rol <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    name="rol" 
                    value={rol}
                    onValueChange={(val) => {
                      setRol(val)
                      setFieldErrors(prev => ({ ...prev, rol: '' }))
                    }}
                    required
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger id="u-rol" data-view-mode={mode === 'view'} aria-invalid={!!fieldErrors.rol}>
                      <span className="flex flex-1 text-left">
                        {ROLES_OPCIONES.find(r => r.value === rol)?.label || "Seleccionar rol"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES_OPCIONES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.rol && <p className="text-xs text-red-500 mt-1">{fieldErrors.rol}</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-3 border-t bg-slate-50 sm:rounded-b-xl">
            {mode === 'view' ? (
              <>
                {usuario && (
                  <Button 
                    type="button" 
                    variant={usuario.activo ? "destructive" : "default"} 
                    size="sm"
                    className="mr-auto"
                    disabled={isPendingToggle}
                    onClick={handleToggle}
                  >
                    {usuario.activo ? (
                      <><PowerOff className="mr-2 h-4 w-4" /> Desactivar</>
                    ) : (
                      <><Power className="mr-2 h-4 w-4" /> Activar</>
                    )}
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                    onClick={() => setHistorialOpen(true)}
                  >
                    <History className="mr-2 h-4 w-4" /> Historial
                  </Button>
                  <Button type="button" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 justify-end w-full">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm" 
                  onClick={() => {
                    if (mode === 'edit') {
                      setNombre(initialUsuario?.nombre ?? '')
                      setEmail(initialUsuario?.email ?? '')
                      setUsuarioErp(initialUsuario?.usuarioErp ?? '')
                      setRol(initialUsuario?.rol ?? ROLES.ANALISTA)
                      setError(null)
                      setMode('view')
                    } else {
                      onOpenChange(false)
                    }
                  }} 
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
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
