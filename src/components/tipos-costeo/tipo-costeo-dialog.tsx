'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Settings2, Hash, Power, PowerOff, History, Pencil, Info, CalendarDays } from 'lucide-react'
import { normalizeText } from '@/lib/utils/text'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { getEmpresasForUser } from '@/app/actions/erp'
import { crearTipoCosteo, editarTipoCosteo, toggleActivo } from '@/app/actions/tipos-costeo'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TipoCosteoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene tipoCosteo, es edición; si no, es creación */
  tipoCosteo?: TipoCosteoRow | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TipoCosteoDialog({ open, onOpenChange, tipoCosteo }: TipoCosteoDialogProps) {
  const [historialOpen, setHistorialOpen] = useState(false)

  // Congelamos el estado inicial al abrir el modal
  const [initialTipoCosteo, setInitialTipoCosteo] = useState(tipoCosteo)
  
  // mode: view (solo lectura), edit (edición), create (nuevo)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(tipoCosteo ? 'view' : 'create')
  
  const [isPendingToggle, startTransitionToggle] = useTransition()

  function handleToggle() {
    if (!tipoCosteo) return
    startTransitionToggle(async () => {
      const result = await toggleActivo(tipoCosteo.id, tipoCosteo.registroVersion)
      if (result.ok) {
        toast.success(
          tipoCosteo.activo
            ? `${tipoCosteo.nombre} fue desactivado`
            : `${tipoCosteo.nombre} fue activado`,
        )
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [empresas, setEmpresas] = useState<{value: string, label: string}[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  const [empresaId, setEmpresaId] = useState(initialTipoCosteo?.empresaId?.toString() ?? '')
  const [codigo, setCodigo] = useState(initialTipoCosteo?.codigo ?? '')
  const [nombre, setNombre] = useState(initialTipoCosteo?.nombre ?? '')
  const [nivel1Activo, setNivel1Activo] = useState(initialTipoCosteo?.nivel1Activo ?? false)
  const [nivel1Etiqueta, setNivel1Etiqueta] = useState(initialTipoCosteo?.nivel1Etiqueta ?? '')
  const [nivel1ConDireccion, setNivel1ConDireccion] = useState(initialTipoCosteo?.nivel1ConDireccion ?? false)
  const [nivel2Activo, setNivel2Activo] = useState(initialTipoCosteo?.nivel2Activo ?? false)
  const [nivel2Etiqueta, setNivel2Etiqueta] = useState(initialTipoCosteo?.nivel2Etiqueta ?? '')
  const [lineaEtiqueta, setLineaEtiqueta] = useState(initialTipoCosteo?.lineaEtiqueta ?? '')
  const [baseEvaluacion, setBaseEvaluacion] = useState<'GLOBAL'|'MENSUAL'>(initialTipoCosteo?.baseEvaluacion ?? 'GLOBAL')

  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          setEmpresas(data.map(e => ({ value: e.id.toString(), label: e.nombre })))
          if (!tipoCosteo && data.length > 0) {
            setEmpresaId(data[0].id.toString())
          }
        })
        .catch(err => toast.error('Error al cargar empresas: ' + err.message))
        .finally(() => setCargandoEmpresas(false))

      setInitialTipoCosteo(tipoCosteo ?? null)
      setMode(tipoCosteo ? 'view' : 'create')
      setEmpresaId(tipoCosteo?.empresaId?.toString() ?? '')
      setCodigo(tipoCosteo?.codigo ?? '')
      setNombre(tipoCosteo?.nombre ?? '')
      setNivel1Activo(tipoCosteo?.nivel1Activo ?? false)
      setNivel1Etiqueta(tipoCosteo?.nivel1Etiqueta ?? '')
      setNivel1ConDireccion(tipoCosteo?.nivel1ConDireccion ?? false)
      setNivel2Activo(tipoCosteo?.nivel2Activo ?? false)
      setNivel2Etiqueta(tipoCosteo?.nivel2Etiqueta ?? '')
      setLineaEtiqueta(tipoCosteo?.lineaEtiqueta ?? '')
      setBaseEvaluacion(tipoCosteo?.baseEvaluacion ?? 'GLOBAL')
      setError(null)
    }
  }, [open, tipoCosteo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    if (!empresaId) {
      setError('Debe seleccionar una empresa')
      setLoading(false)
      return
    }
    formData.append('empresaId', empresaId)
    formData.append('codigo', codigo)
    formData.append('nombre', nombre)
    formData.append('nivel1Activo', String(nivel1Activo))
    formData.append('nivel1Etiqueta', nivel1Etiqueta)
    formData.append('nivel1ConDireccion', String(nivel1ConDireccion))
    formData.append('nivel2Activo', String(nivel2Activo))
    formData.append('nivel2Etiqueta', nivel2Etiqueta)
    formData.append('lineaEtiqueta', lineaEtiqueta)
    formData.append('baseEvaluacion', baseEvaluacion)
    if (initialTipoCosteo?.registroVersion) {
      formData.append('registroVersion', String(initialTipoCosteo.registroVersion))
    }
    
    try {
      let result
      if (mode === 'edit' && tipoCosteo) {
        result = await editarTipoCosteo(tipoCosteo.id, null, formData)
      } else {
        result = await crearTipoCosteo(null, formData)
      }

      if (result && !result.ok) {
        if (result.field === 'codigo') {
          const el = document.getElementById('tc-codigo') as HTMLInputElement
          if (el) {
            el.setCustomValidity(result.error)
            el.reportValidity()
            return
          }
        }
        
        throw new Error(result.error)
      }

      toast.success(tipoCosteo ? 'Tipo de costeo actualizado' : 'Tipo de costeo creado')
      if (mode === 'edit') {
        if (result?.data) {
          setInitialTipoCosteo(result.data as TipoCosteoRow)
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-slate-500" />
            {mode === 'create' ? 'Nuevo Tipo Costeo' : mode === 'edit' ? 'Editar Tipo Costeo' : 'Detalles Tipo Costeo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="pt-2">
          {error && <div className="text-red-500 text-sm font-medium mb-4">{error}</div>}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 bg-transparent border-b w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger 
                value="general" 
                className="flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="niveles" 
                className="flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
              >
                <Hash className="w-4 h-4 mr-2" />
                Niveles
              </TabsTrigger>
              <TabsTrigger 
                value="evaluacion" 
                className="flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Evaluación
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="outline-none mt-0 min-h-[250px]">
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                
                {/* Empresa */}
                <div className="space-y-1.5 col-span-4">
                  <Label>
                    Empresa <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelect
                    options={empresas}
                    value={empresaId}
                    onChange={(val) => {
                      setEmpresaId(val)
                      setError(null)
                    }}
                    placeholder={cargandoEmpresas ? "Cargando..." : "Seleccionar empresa"}
                    disabled={mode === 'view' || mode === 'edit' || cargandoEmpresas}
                  />
                </div>

                {/* Código */}
                {mode !== 'create' && (
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="tc-codigo">
                      Código
                    </Label>
                    <Input
                      id="tc-codigo"
                      name="codigo"
                      value={codigo}
                      readOnly
                      disabled
                      className="bg-muted/50 font-mono text-sm uppercase"
                    />
                  </div>
                )}

                {/* Nombre */}
                <div className={`space-y-1.5 ${mode === 'create' ? 'col-span-4' : 'col-span-3'}`}>
                  <Label htmlFor="tc-nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tc-nombre"
                    name="nombre"
                    placeholder="Ej: Costeo General"
                    value={nombre}
                    required
                    autoComplete="off"
                    className="uppercase"
                    disabled={mode === 'view'}
                    data-view-mode={mode === 'view'}
                    onChange={(e) => {
                      setNombre(normalizeText(e.target.value))
                      e.target.setCustomValidity('')
                    }}
                    onInvalid={(e) => {
                      if ((e.target as HTMLInputElement).validity.valueMissing) {
                        (e.target as HTMLInputElement).setCustomValidity('El nombre es requerido')
                      }
                    }}
                  />
                </div>

                {/* Línea Etiqueta */}
                <div className="space-y-2 col-span-4">
                  <Label htmlFor="tc-linea">
                    Etiqueta Línea <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tc-linea"
                    name="lineaEtiqueta"
                    placeholder="Ej: Insumos"
                    value={lineaEtiqueta}
                    required
                    autoComplete="off"
                    className="uppercase"
                    disabled={mode === 'view'}
                    data-view-mode={mode === 'view'}
                    onChange={(e) => {
                      setLineaEtiqueta(normalizeText(e.target.value))
                      e.target.setCustomValidity('')
                    }}
                    onInvalid={(e) => {
                      if ((e.target as HTMLInputElement).validity.valueMissing) {
                        (e.target as HTMLInputElement).setCustomValidity('La etiqueta de la línea es requerida')
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="niveles" className="outline-none mt-0 min-h-[250px]">
              {tipoCosteo?.enUso && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-start gap-3 text-sm">
                  <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <p>
                    La activación de estos niveles no se puede modificar porque ya existen Costeos utilizando esta estructura. Sin embargo, puede modificar sus etiquetas.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                
                {/* Nivel 1 */}
                <div className="col-span-1 space-y-4 border p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tc-n1-activo" className="font-semibold">Nivel 1 Activo</Label>
                    <Switch
                      id="tc-n1-activo"
                      checked={nivel1Activo}
                      onCheckedChange={(checked) => {
                        setNivel1Activo(checked)
                        if (!checked) {
                          setNivel1Etiqueta('')
                          setNivel1ConDireccion(false)
                        }
                      }}
                      disabled={mode === 'view' || !!tipoCosteo?.enUso}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="tc-n1-etiqueta">
                      Etiqueta Nivel 1
                    </Label>
                    <Input
                      id="tc-n1-etiqueta"
                      name="nivel1Etiqueta"
                      placeholder="Ej: SITIO"
                      value={nivel1Etiqueta}
                      autoComplete="off"
                      className="uppercase"
                      disabled={mode === 'view' || !nivel1Activo}
                      data-view-mode={mode === 'view'}
                      onChange={(e) => {
                        setNivel1Etiqueta(normalizeText(e.target.value))
                        e.target.setCustomValidity('')
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="tc-n1-dir">Con Dirección (Nivel 1)</Label>
                    <Switch
                      id="tc-n1-dir"
                      checked={nivel1ConDireccion}
                      onCheckedChange={setNivel1ConDireccion}
                      disabled={mode === 'view' || !nivel1Activo}
                    />
                  </div>
                </div>

                {/* Nivel 2 */}
                <div className="col-span-1 space-y-4 border p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tc-n2-activo" className="font-semibold">Nivel 2 Activo</Label>
                    <Switch
                      id="tc-n2-activo"
                      checked={nivel2Activo}
                      onCheckedChange={(checked) => {
                        setNivel2Activo(checked)
                        if (!checked) {
                          setNivel2Etiqueta('')
                        }
                      }}
                      disabled={mode === 'view' || !!tipoCosteo?.enUso}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="tc-n2-etiqueta">
                      Etiqueta Nivel 2
                    </Label>
                    <Input
                      id="tc-n2-etiqueta"
                      name="nivel2Etiqueta"
                      placeholder="Ej: PUESTO"
                      value={nivel2Etiqueta}
                      autoComplete="off"
                      className="uppercase"
                      disabled={mode === 'view' || !nivel2Activo}
                      data-view-mode={mode === 'view'}
                      onChange={(e) => {
                        setNivel2Etiqueta(normalizeText(e.target.value))
                        e.target.setCustomValidity('')
                      }}
                    />
                  </div>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="evaluacion" className="outline-none mt-0 min-h-[250px]">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Base Evaluación Financiera</Label>
                  <p className="text-sm text-slate-500">
                    Define la temporalidad sobre la cual se consolidarán y evaluarán las ventas y los costos de los contratos asociados a este Tipo de Costeo.
                  </p>
                </div>
                
                {tipoCosteo?.enUso && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-start gap-3 text-sm">
                    <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                    <p>
                      La base de evaluación no se puede modificar porque ya existen Costeos utilizando esta configuración.
                    </p>
                  </div>
                )}

                <RadioGroup 
                  value={baseEvaluacion} 
                  onValueChange={(val: 'GLOBAL' | 'MENSUAL') => setBaseEvaluacion(val)}
                  disabled={mode === 'view' || !!tipoCosteo?.enUso}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div
                    onClick={() => { if (mode !== 'view' && !tipoCosteo?.enUso) setBaseEvaluacion('GLOBAL') }}
                    className={cn(
                      "relative flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      baseEvaluacion === 'GLOBAL' ? "border-indigo-600 bg-indigo-50/50" : "border-muted bg-popover",
                      (mode === 'view' || tipoCosteo?.enUso) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem value="GLOBAL" id="eval-global" className="absolute top-4 left-4" />
                    <Label
                      htmlFor="eval-global"
                      className="flex flex-col items-center w-full cursor-pointer pointer-events-none"
                    >
                      <span className="font-semibold text-base mb-2 text-center w-full">Plazo Completo</span>
                      <span className="text-sm text-center text-slate-500 font-normal">
                        Suma el total de la venta y el total del costo durante toda la vida del contrato.
                      </span>
                    </Label>
                  </div>
                  
                  <div
                    onClick={() => { if (mode !== 'view' && !tipoCosteo?.enUso) setBaseEvaluacion('MENSUAL') }}
                    className={cn(
                      "relative flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      baseEvaluacion === 'MENSUAL' ? "border-indigo-600 bg-indigo-50/50" : "border-muted bg-popover",
                      (mode === 'view' || tipoCosteo?.enUso) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem value="MENSUAL" id="eval-mensual" className="absolute top-4 left-4" />
                    <Label
                      htmlFor="eval-mensual"
                      className="flex flex-col items-center w-full cursor-pointer pointer-events-none"
                    >
                      <span className="font-semibold text-base mb-2 text-center w-full">Mensual</span>
                      <span className="text-sm text-center text-slate-500 font-normal">
                        Todos los costos se mensualizan y la evaluación se realiza mes a mes.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-3 border-t bg-slate-50 sm:rounded-b-xl">
            {mode === 'view' ? (
              <>
                {tipoCosteo && (
                  <Button 
                    type="button" 
                    variant={tipoCosteo.activo ? "destructive" : "default"} 
                    size="sm"
                    className="mr-auto"
                    disabled={isPendingToggle}
                    onClick={handleToggle}
                  >
                    {tipoCosteo.activo ? (
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
                      setEmpresaId(initialTipoCosteo?.empresaId?.toString() ?? '')
                      setCodigo(initialTipoCosteo?.codigo ?? '')
                      setNombre(initialTipoCosteo?.nombre ?? '')
                      setNivel1Activo(initialTipoCosteo?.nivel1Activo ?? false)
                      setNivel1Etiqueta(initialTipoCosteo?.nivel1Etiqueta ?? '')
                      setNivel1ConDireccion(initialTipoCosteo?.nivel1ConDireccion ?? false)
                      setNivel2Activo(initialTipoCosteo?.nivel2Activo ?? false)
                      setNivel2Etiqueta(initialTipoCosteo?.nivel2Etiqueta ?? '')
                      setLineaEtiqueta(initialTipoCosteo?.lineaEtiqueta ?? '')
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
    {tipoCosteo && (
      <HistorialDrawer
        open={historialOpen}
        onOpenChange={setHistorialOpen}
        entidadId={tipoCosteo.id}
        entidadTipo="Tipo Costeo"
        tabla="costeos_tipo_costeo"
      />
    )}
    </>
  )
}
