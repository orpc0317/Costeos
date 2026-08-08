'use client'

import { useState, useEffect } from 'react'
import { Building2, Pencil, History, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldError } from '@/components/ui/field-error'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { normalizeText } from '@/lib/utils/text'
import { crearEmpresa, actualizarEmpresa } from '@/app/actions/empresas'
import { buscarEmpresaErp } from '@/app/actions/erp'
import type { EmpresaRow } from '@/lib/types/empresas'

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmpresaModalProps {
  empresa?: EmpresaRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmpresaModal({ empresa, trigger, open: controlledOpen, onOpenChange, onSuccess }: EmpresaModalProps) {
  // Soporta tanto modo controlado (open/onOpenChange) como modo autónomo (trigger)
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const isExisting = !!empresa
  const [historialOpen, setHistorialOpen] = useState(false)

  // ── Estado del modo ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // ── Estado del formulario ───────────────────────────────────────────────────
  const [nombre, setNombre] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [nit, setNit] = useState('')
  const [codigoErp, setCodigoErp] = useState('')
  const [sincronizarItems, setSincronizarItems] = useState(false)
  const [sincronizarCategorias, setSincronizarCategorias] = useState(false)

  // ── Estado del lookup ERP ───────────────────────────────────────────────────
  const [nombreErp, setNombreErp] = useState<string | null>(null)
  const [buscandoErp, setBuscandoErp] = useState(false)

  // ── Estado de errores y UI ──────────────────────────────────────────────────
  // fieldErrors unifica TODOS los errores de campo: validaciones locales,
  // errores del servidor y errores del ERP. Se presenta via <FieldError>.
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // ── Reset del formulario ────────────────────────────────────────────────────
  const resetForm = (data?: EmpresaRow) => {
    setNombre(data?.nombre ?? '')
    setRazonSocial(data?.razonSocial ?? '')
    setNit(data?.nit ?? '')
    setCodigoErp(data?.codigoErp ?? '')
    setSincronizarItems(data?.sincronizarItems ?? false)
    setSincronizarCategorias(data?.sincronizarCategorias ?? false)
    setGlobalError(null)
    setFieldErrors({})
    setNombreErp(null)
  }

  // ── Apertura/Cierre del modal ───────────────────────────────────────────────
  // CRÍTICO: Inicializar estado AQUÍ, cuando newOpen === true.
  // NUNCA en useEffect con dependencias en `empresa` o `mode`.
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      resetForm(empresa)
      setMode(isExisting ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  // ── Cargar nombre ERP para registros existentes ─────────────────────────────
  // SOLO depende de [open] — nunca de `empresa` ni de `mode` (convención anti-flash).
  // Al abrir un registro que ya tiene codigo_erp, consulta el ERP para mostrar
  // el nombre informativo en modo Vista y Edición.
  useEffect(() => {
    if (open && isExisting && empresa?.codigoErp) {
      buscarEmpresaErp(empresa.codigoErp).then(resultado => {
        if (resultado) setNombreErp(resultado.nombre)
      })
    }
  }, [open])

  // ── Lookup ERP al salir del campo Código ERP ────────────────────────────────
  // El resultado (encontrado o no) se canaliza siempre a través de fieldErrors,
  // igual que cualquier otro error de campo, sin importar su origen.
  async function handleCodigoErpBlur() {
    const codigo = codigoErp.trim()

    // Si el campo quedó vacío, limpiar todo y salir
    if (!codigo) {
      setNombreErp(null)
      setFieldErrors(prev => { const e = { ...prev }; delete e.codigoErp; return e })
      return
    }

    setBuscandoErp(true)
    try {
      const resultado = await buscarEmpresaErp(codigo)
      if (resultado) {
        setNombreErp(resultado.nombre)
        setFieldErrors(prev => { const e = { ...prev }; delete e.codigoErp; return e })
      } else {
        setNombreErp(null)
        setFieldErrors(prev => ({ ...prev, codigoErp: 'No encontrado en ERP' }))
      }
    } catch {
      setNombreErp(null)
      setFieldErrors(prev => ({ ...prev, codigoErp: 'Error al consultar el ERP' }))
    } finally {
      setBuscandoErp(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    const codigoTrimmed = codigoErp.trim()

    // ── Paso 1: Validaciones locales ────────────────────────────────────────
    const errors: Record<string, string> = {}
    if (!nombre.trim())      errors.nombre      = 'Requerido'
    if (!razonSocial.trim()) errors.razonSocial = 'Requerido'
    if (!nit.trim())         errors.nit         = 'Requerido'

    // ── Paso 2: Validación ERP (solo al crear y si se ingresó un código) ────
    // El nombreErp es el indicador de estado de la verificación ERP:
    //   - nombreErp visible   → ya fue verificado y existe   ✅ sin error
    //   - fieldErrors activo  → ya fue verificado y no existe ❌ bloquear
    //   - ninguno de los dos  → aún no se verificó           → verificar ahora
    if (!isExisting && codigoTrimmed) {
      if (fieldErrors.codigoErp) {
        // Código ya verificado y fallido — preservar el error
        errors.codigoErp = fieldErrors.codigoErp
      } else if (!nombreErp) {
        // El usuario no hizo blur antes de guardar — verificar inline y esperar
        setBuscandoErp(true)
        try {
          const resultado = await buscarEmpresaErp(codigoTrimmed)
          if (resultado) {
            setNombreErp(resultado.nombre)
            // Código válido — continúa al guardado sin error
          } else {
            errors.codigoErp = 'No encontrado en ERP'
          }
        } catch {
          errors.codigoErp = 'Error al consultar el ERP'
        } finally {
          setBuscandoErp(false)
        }
      }
      // Si nombreErp ya está visible → código verificado → sin error, continúa
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const data = {
        nombre:               normalizeText(nombre),
        razonSocial:          normalizeText(razonSocial),
        nit:                  nit.trim().toUpperCase(),
        codigoErp:            codigoErp.trim(),
        sincronizarItems,
        sincronizarCategorias,
      }

      const res = isExisting
        ? await actualizarEmpresa(empresa!.id, { ...data, registroVersion: empresa!.registroVersion })
        : await crearEmpresa(data)

      if (!res.ok) {
        if (res.field) {
          setFieldErrors({ [res.field]: res.error })
        } else {
          setGlobalError(res.error)
        }
        return
      }

      resetForm(res.data)
      if (!isExisting) {
        setOpen(false)
      } else {
        setMode('view')
      }
      onSuccess?.()
    } catch {
      setGlobalError('Error inesperado del servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const title = !isExisting
    ? 'Nueva Empresa'
    : mode === 'view'
    ? 'Detalle Empresa'
    : 'Editar Empresa'

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

        <DialogContent className="sm:max-w-[500px] h-[85vh] sm:h-[600px] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-slate-500" />
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Error global */}
          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md mb-4 border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSave} noValidate className="flex-1 overflow-hidden flex flex-col pt-2">
            <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Building2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Nombre */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="empresa-nombre">Nombre <span className="text-red-500">*</span></Label>
                      <Input
                        id="empresa-nombre"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        disabled={mode === 'view'}
                        className="h-8 py-1 uppercase"
                        aria-invalid={!!fieldErrors.nombre}
                      />
                      <FieldError message={fieldErrors.nombre} />
                    </div>

                    {/* Razón Social */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label htmlFor="empresa-razon-social">Razón Social <span className="text-red-500">*</span></Label>
                      <Input
                        id="empresa-razon-social"
                        value={razonSocial}
                        onChange={e => setRazonSocial(e.target.value)}
                        disabled={mode === 'view'}
                        className="h-8 py-1 uppercase"
                        aria-invalid={!!fieldErrors.razonSocial}
                      />
                      <FieldError message={fieldErrors.razonSocial} />
                    </div>

                    {/* NIT */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <Label htmlFor="empresa-nit">NIT <span className="text-red-500">*</span></Label>
                      <Input
                        id="empresa-nit"
                        value={nit}
                        onChange={e => setNit(e.target.value)}
                        disabled={mode === 'view'}
                        className="h-8 py-1 font-mono text-sm uppercase"
                        aria-invalid={!!fieldErrors.nit}
                      />
                      <FieldError message={fieldErrors.nit} />
                    </div>

                    {/* Código ERP */}
                    {/* Al crear: visible y editable con lookup ERP onBlur.
                        Al editar: visible y siempre deshabilitado (campo autogenerado). */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <Label htmlFor="empresa-codigo-erp">Código ERP</Label>
                      {isExisting ? (
                        // Registro existente: siempre deshabilitado
                        <>
                          <Input
                            id="empresa-codigo-erp"
                            value={codigoErp}
                            disabled={true}
                            className="h-8 py-1 bg-muted/50 font-mono text-sm"
                          />
                          {/* Nombre ERP — informativo, nunca se graba en Costeos */}
                          {nombreErp && (
                            <p className="text-xs text-emerald-600 !mt-0.5 leading-none font-medium">
                              ✓ {nombreErp}
                            </p>
                          )}
                        </>
                      ) : (
                        // Creación: editable con lookup ERP
                        <>
                          <div className="relative">
                            <Input
                              id="empresa-codigo-erp"
                              value={codigoErp}
                              onChange={e => {
                                setCodigoErp(e.target.value)
                                // Limpiar nombre y error al modificar el código
                                setNombreErp(null)
                                setFieldErrors(prev => { const e2 = { ...prev }; delete e2.codigoErp; return e2 })
                              }}
                              maxLength={10}
                              className="h-8 py-1 font-mono text-sm pr-8"
                              placeholder="Opcional"
                              aria-invalid={!!fieldErrors.codigoErp}
                            />
                            {buscandoErp && (
                              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {/* Nombre ERP — informativo, nunca se graba en Costeos */}
                          {nombreErp && (
                            <p className="text-xs text-emerald-600 !mt-0.5 leading-none font-medium">
                              ✓ {nombreErp}
                            </p>
                          )}
                          {/* Error de campo unificado — misma presentación sin importar el origen */}
                          <FieldError message={fieldErrors.codigoErp} />
                        </>
                      )}
                    </div>

                    {/* Checkboxes de sincronización */}
                    <div className="flex items-center gap-4 col-span-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sync-items"
                          checked={sincronizarItems}
                          onCheckedChange={v => setSincronizarItems(!!v)}
                          disabled={mode === 'view'}
                        />
                        <Label htmlFor="sync-items" className="font-normal cursor-pointer">
                          Sync Items
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sync-categorias"
                          checked={sincronizarCategorias}
                          onCheckedChange={v => setSincronizarCategorias(!!v)}
                          disabled={mode === 'view'}
                        />
                        <Label htmlFor="sync-categorias" className="font-normal cursor-pointer">
                          Sync Categorías
                        </Label>
                      </div>
                    </div>

                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* ── Footer estándar — SIEMPRE al fondo con borde ── */}
            <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
              <div />
              <div className="flex gap-2 justify-end">
                {mode === 'view' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800"
                      onClick={() => setHistorialOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <Button type="button" onClick={() => setMode('edit')}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  </>
                )}
                {mode === 'edit' && (
                  <>
                    {isExisting && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetForm(empresa)
                          setMode('view')
                        }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading || buscandoErp}>
                      {loading
                        ? 'Guardando...'
                        : buscandoErp
                        ? 'Verificando...'
                        : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Historial Auditoría — fuera del Dialog, dentro del fragmento */}
      {isExisting && empresa && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={empresa.id}
          entidadTipo="Empresa"
          tabla="costeos_empresa"
        />
      )}
    </>
  )
}
