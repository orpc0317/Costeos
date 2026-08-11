'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Settings2, Hash, Power, PowerOff, History, Pencil, Info, CalendarDays, CornerDownRight, Network, Building, MapPin, Briefcase, Users, Layers, Box, Component, Folder, ListTree, Tags, ChevronDown } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NumericInput } from '@/components/ui/numeric-input'
import { getEmpresasForUser } from '@/app/actions/erp'
import { crearTipoCosteo, editarTipoCosteo, toggleActivo } from '@/app/actions/tipos-costeo'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'

const PREDEFINED_COLORS = [
  'bg-white text-slate-900 border-slate-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-teal-100 text-teal-700 border-teal-200',
]

const PREDEFINED_ICONS = [
  'Building', 'MapPin', 'Briefcase', 'Users', 'Layers', 
  'Box', 'Component', 'Folder', 'ListTree', 'Tags'
]

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  Building, MapPin, Briefcase, Users, Layers, 
  Box, Component, Folder, ListTree, Tags, Network, Hash
}

interface TipoCosteoDialogProps {
  tipoCosteo?: TipoCosteoRow | null
  trigger: React.ReactNode
}

export function TipoCosteoDialog({ tipoCosteo, trigger }: TipoCosteoDialogProps) {
  const [open, setOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  const [initialTipoCosteo, setInitialTipoCosteo] = useState<TipoCosteoRow | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create')
  const [isPendingToggle, startTransitionToggle] = useTransition()

  function handleToggle() {
    if (!initialTipoCosteo) return
    startTransitionToggle(async () => {
      const result = await toggleActivo(initialTipoCosteo.id, initialTipoCosteo.registroVersion)
      if (result.ok) {
        toast.success(
          initialTipoCosteo.activo
            ? `${initialTipoCosteo.nombre} fue desactivado`
            : `${initialTipoCosteo.nombre} fue activado`,
        )
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('general')
  
  const [empresas, setEmpresas] = useState<{value: string, label: string}[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  const [empresaId, setEmpresaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [cantidadNiveles, setCantidadNiveles] = useState(2)
  const [etiquetasNiveles, setEtiquetasNiveles] = useState<string[]>(['NIVEL 1', 'NIVEL 2'])
  const [coloresNiveles, setColoresNiveles] = useState<string[]>([PREDEFINED_COLORS[0], PREDEFINED_COLORS[1]])
  const [iconosNiveles, setIconosNiveles] = useState<string[]>([PREDEFINED_ICONS[0], PREDEFINED_ICONS[1]])
  const [nivelConDireccion, setNivelConDireccion] = useState(1)
  const [lineaEtiqueta, setLineaEtiqueta] = useState('')
  const [baseEvaluacion, setBaseEvaluacion] = useState<'GLOBAL'|'MENSUAL'>('GLOBAL')
  const [manejoPlazo, setManejoPlazo] = useState<'LIBRE'|'FIJO'|'NO_APLICA'>('NO_APLICA')
  const [fijarPlazo, setFijarPlazo] = useState<number>(0)

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      // Inicializar SIEMPRE aquí, nunca en useEffect con dependencias de datos
      const tc = tipoCosteo ?? null
      setInitialTipoCosteo(tc)
      setMode(tc ? 'view' : 'create')
      setActiveTab('general')
      setEmpresaId(tc?.empresaId?.toString() ?? '')
      setNombre(tc?.nombre ?? '')
      setCantidadNiveles(tc?.cantidadNiveles ?? 2)
      setEtiquetasNiveles(tc?.etiquetasNiveles ? tc.etiquetasNiveles.split(',') : ['NIVEL 1', 'NIVEL 2'])
      setColoresNiveles(tc?.coloresNiveles ? tc.coloresNiveles.split(',') : [PREDEFINED_COLORS[0], PREDEFINED_COLORS[0]])
      setIconosNiveles(tc?.iconosNiveles ? tc.iconosNiveles.split(',') : [PREDEFINED_ICONS[0], PREDEFINED_ICONS[0]])
      setNivelConDireccion(tc?.nivelConDireccion ?? 1)
      setLineaEtiqueta(tc?.lineaEtiqueta ?? '')
      setBaseEvaluacion(tc?.baseEvaluacion ?? 'GLOBAL')
      setManejoPlazo(tc?.manejoPlazo ?? 'NO_APLICA')
      setFijarPlazo(tc?.fijarPlazo ?? 0)
      setError(null)
      setFieldErrors({})

      // Cargar empresas
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          setEmpresas(data.map(e => ({ value: e.id.toString(), label: e.nombre })))
          if (!tc && data.length > 0) {
            setEmpresaId(data[0].id.toString())
          }
        })
        .catch(err => toast.error('Error al cargar empresas: ' + err.message))
        .finally(() => setCargandoEmpresas(false))
    }
    setOpen(newOpen)
  }

  useEffect(() => {
    setEtiquetasNiveles(prev => {
      if (prev.length === cantidadNiveles) return prev
      const newArray = [...prev]
      while (newArray.length < cantidadNiveles) {
        newArray.push(`NIVEL ${newArray.length + 1}`)
      }
      return newArray.slice(0, cantidadNiveles)
    })
    setColoresNiveles(prev => {
      if (prev.length === cantidadNiveles) return prev
      const newArray = [...prev]
      while (newArray.length < cantidadNiveles) {
        newArray.push(PREDEFINED_COLORS[0])
      }
      return newArray.slice(0, cantidadNiveles)
    })
    setIconosNiveles(prev => {
      if (prev.length === cantidadNiveles) return prev
      const newArray = [...prev]
      while (newArray.length < cantidadNiveles) {
        newArray.push(PREDEFINED_ICONS[0])
      }
      return newArray.slice(0, cantidadNiveles)
    })
  }, [cantidadNiveles])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    const formData = new FormData()
    if (!empresaId) {
      setFieldErrors({ empresaId: 'Requerido' })
      setActiveTab('general')
      setLoading(false)
      return
    }
    formData.append('empresaId', empresaId)

    formData.append('nombre', nombre)
    formData.append('cantidadNiveles', cantidadNiveles.toString())
    formData.append('etiquetasNiveles', etiquetasNiveles.join(','))
    formData.append('coloresNiveles', coloresNiveles.join(','))
    formData.append('iconosNiveles', iconosNiveles.join(','))
    formData.append('nivelConDireccion', nivelConDireccion.toString())
    formData.append('lineaEtiqueta', lineaEtiqueta)
    formData.append('baseEvaluacion', baseEvaluacion)
    formData.append('manejoPlazo', manejoPlazo)
    formData.append('fijarPlazo', fijarPlazo.toString())
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
        if (result.field) {
          const generalFields = ['empresaId', 'nombre', 'lineaEtiqueta']
          const nivelesFields = ['cantidadNiveles', 'etiquetasNiveles', 'nivelConDireccion']
          const evaluacionFields = ['baseEvaluacion', 'manejoPlazo', 'fijarPlazo']

          if (generalFields.includes(result.field)) setActiveTab('general')
          else if (nivelesFields.includes(result.field)) setActiveTab('niveles')
          else if (evaluacionFields.includes(result.field)) setActiveTab('evaluacion')

          setTimeout(() => {
            let elementId = `tc-${result.field}`
            if (result.field === 'lineaEtiqueta') elementId = 'tc-linea'

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

      toast.success(tipoCosteo ? 'Tipo de costeo actualizado' : 'Tipo de costeo creado')
      if (mode === 'edit') {
        if (result?.data) {
          setInitialTipoCosteo(result.data as TipoCosteoRow)
        }
        setMode('view')
      } else {
        setOpen(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleUpdateEtiqueta(index: number, value: string) {
    setEtiquetasNiveles(prev => {
      const newArray = [...prev]
      newArray[index] = value
      return newArray
    })
  }

  function handleUpdateColor(index: number, value: string) {
    setColoresNiveles(prev => {
      const newArray = [...prev]
      newArray[index] = value
      return newArray
    })
  }
  
  function handleUpdateIcon(index: number, value: string) {
    setIconosNiveles(prev => {
      const newArray = [...prev]
      newArray[index] = value
      return newArray
    })
  }

  return (
    <>
    {React.cloneElement(trigger as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        handleOpenChange(true)
      },
    })}
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[520px] max-h-[90vh] flex flex-col">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-slate-500" />
            {mode === 'create' ? 'Nuevo Tipo Costeo' : mode === 'edit' ? 'Editar Tipo Costeo' : 'Detalles Tipo Costeo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col" noValidate>
          {error && <div className="text-red-500 text-sm font-medium mb-4 shrink-0">{error}</div>}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList variant="line" className="mb-4 shrink-0">
              <TabsTrigger value="general">
                <Settings2 className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="niveles">
                <Network className="w-4 h-4 mr-2" />
                Estructura
              </TabsTrigger>
              <TabsTrigger value="evaluacion">
                <CalendarDays className="w-4 h-4 mr-2" />
                Evaluación
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <TabsContent value="general" className="outline-none mt-0">
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                
                {/* Empresa */}
                <div className="space-y-1.5 col-span-4">
                  <Label>
                    Empresa <span className="text-red-500">*</span>
                  </Label>
                    <SearchableSelect
                      id="tc-empresaId"
                      options={empresas}
                      value={empresaId}
                      error={!!fieldErrors.empresaId}
                      onChange={(val) => {
                        setEmpresaId(val)
                        setError(null)
                        setFieldErrors(prev => ({ ...prev, empresaId: '' }))
                      }}
                      placeholder={cargandoEmpresas ? "Cargando..." : "Seleccionar empresa"}
                      disabled={mode === 'view' || mode === 'edit' || cargandoEmpresas}
                    />
                    {fieldErrors.empresaId && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.empresaId}</p>}
                  </div>

                {/* Nombre */}
                <div className="space-y-1.5 col-span-4">
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
                    aria-invalid={!!fieldErrors.nombre}
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
                  {fieldErrors.nombre && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nombre}</p>}
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
                    aria-invalid={!!fieldErrors.lineaEtiqueta}
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
                  {fieldErrors.lineaEtiqueta && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.lineaEtiqueta}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="niveles" className="outline-none mt-0">

              
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="space-y-1.5 w-1/4">
                    <Label htmlFor="tc-cantidadNiveles">
                      Cantidad Niveles
                    </Label>
                    <NumericInput
                      id="tc-cantidadNiveles"
                      value={cantidadNiveles}
                      onChange={(val) => {
                        setCantidadNiveles(val || 0)
                      }}
                      isInteger={true}
                      min="0"
                      max="10"
                      disabled={mode === 'view' || !!tipoCosteo?.enUso}
                      aria-invalid={!!fieldErrors.cantidadNiveles}
                    />
                    {fieldErrors.cantidadNiveles && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.cantidadNiveles}</p>}
                  </div>
                  
                  <div className="space-y-1.5 w-1/4">
                    <Label htmlFor="tc-nivelConDireccion">
                      Nivel Con Dirección
                    </Label>
                    <NumericInput
                      id="tc-nivelConDireccion"
                      value={nivelConDireccion}
                      onChange={(val) => {
                        setNivelConDireccion(val || 0)
                      }}
                      isInteger={true}
                      min="0"
                      max={cantidadNiveles.toString()}
                      disabled={mode === 'view' || !!tipoCosteo?.enUso}
                      aria-invalid={!!fieldErrors.nivelConDireccion}
                    />
                    <p className="text-[11px] text-muted-foreground !mt-0.5 leading-none">0 = Ningún nivel maneja dirección</p>
                    {fieldErrors.nivelConDireccion && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.nivelConDireccion}</p>}
                  </div>
                </div>

                {cantidadNiveles > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold border-b pb-2 block">Estructura Costeo</Label>
                    <div className="h-[250px] overflow-y-auto pr-4 py-2 space-y-3 bg-slate-50/50 rounded-md border border-slate-100 p-4">
                      {Array.from({ length: cantidadNiveles }).map((_, i) => (
                        <div key={i} className="flex items-start">
                          {i > 0 && (
                            <div className="flex shrink-0 justify-end" style={{ marginLeft: `${(i - 1) * 32}px`, width: '32px' }}>
                              <CornerDownRight className="w-5 h-5 text-slate-300 mt-2" />
                            </div>
                          )}
                          <div className={cn(
                            "flex flex-col gap-1.5 w-full", 
                            i > 0 && "ml-2"
                          )}>
                            <Label htmlFor={`tc-etiqueta-nivel-${i}`} className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                              <span>Nivel {i + 1}</span>
                              {nivelConDireccion === i + 1 && <span className="text-emerald-700 text-[10px] uppercase font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Con Dirección</span>}
                            </Label>
                            <div className="flex items-center gap-2">
                              {/* ICON DROPDOWN */}
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button variant="outline" size="icon" className={cn("h-8 w-8 shrink-0", coloresNiveles[i])} disabled={mode === 'view'}>
                                    {(() => {
                                      const IconComp = ICON_COMPONENTS[iconosNiveles[i] || 'Hash'] || Hash
                                      return <IconComp className="w-4 h-4" />
                                    })()}
                                  </Button>
                                } />
                                <DropdownMenuContent align="start" className="w-[200px]">
                                  <div className="grid grid-cols-5 gap-1 p-1">
                                    {PREDEFINED_ICONS.map((iconName) => {
                                      const Icon = ICON_COMPONENTS[iconName]
                                      return (
                                        <Button
                                          key={iconName}
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className={cn("h-8 w-8", iconosNiveles[i] === iconName && "bg-accent")}
                                          onClick={() => handleUpdateIcon(i, iconName)}
                                        >
                                          <Icon className="w-4 h-4" />
                                        </Button>
                                      )
                                    })}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* COLOR DROPDOWN */}
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button variant="outline" size="icon" className={cn("h-8 w-8 shrink-0 bg-white")} disabled={mode === 'view'}>
                                    <div className={cn("w-4 h-4 rounded-full border", coloresNiveles[i])} />
                                  </Button>
                                } />
                                <DropdownMenuContent align="start" className="w-[180px]">
                                  <div className="grid grid-cols-5 gap-1 p-1">
                                    {PREDEFINED_COLORS.map((colorClass, idx) => (
                                      <Button
                                        key={idx}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-8 w-8", coloresNiveles[i] === colorClass && "ring-2 ring-ring")}
                                        onClick={() => handleUpdateColor(i, colorClass)}
                                      >
                                        <div className={cn("w-5 h-5 rounded-full border", colorClass)} />
                                      </Button>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Input
                                id={`tc-etiqueta-nivel-${i}`}
                                placeholder={`NIVEL ${i + 1}`}
                                value={etiquetasNiveles[i] || ''}
                                onChange={(e) => handleUpdateEtiqueta(i, normalizeText(e.target.value))}
                                disabled={mode === 'view'}
                                autoComplete="off"
                                className={cn("uppercase h-8 text-sm flex-1 font-bold", coloresNiveles[i])}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="evaluacion" className="outline-none mt-0">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-base font-semibold">Base Evaluación Financiera</Label>
                  <p className="text-sm text-slate-500">
                    Define la temporalidad sobre la cual se consolidarán y evaluarán las ventas y los costos de los contratos asociados a este Tipo de Costeo.
                  </p>
                </div>
                


                <RadioGroup 
                  value={baseEvaluacion} 
                  onValueChange={(val: 'GLOBAL' | 'MENSUAL') => setBaseEvaluacion(val)}
                  disabled={mode === 'view' || !!tipoCosteo?.enUso}
                  className="flex flex-col gap-2"
                >
                  <div
                    onClick={() => { if (mode !== 'view' && !tipoCosteo?.enUso) setBaseEvaluacion('GLOBAL') }}
                    className={cn(
                      "flex flex-row items-center space-x-3 rounded-md border p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      baseEvaluacion === 'GLOBAL' ? "border-indigo-600 bg-indigo-50/50" : "border-muted bg-popover",
                      (mode === 'view' || tipoCosteo?.enUso) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem value="GLOBAL" id="eval-global" />
                    <Label
                      htmlFor="eval-global"
                      className="flex-1 cursor-pointer pointer-events-none grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-1 sm:gap-2 sm:items-center"
                    >
                      <span className="font-semibold text-sm">Plazo Completo</span>
                      <span className="text-xs text-slate-500 font-normal leading-tight">
                        Suma los totales de las ventas y los costos durante toda la vida del contrato.
                      </span>
                    </Label>
                  </div>
                  
                  <div
                    onClick={() => { if (mode !== 'view' && !tipoCosteo?.enUso) setBaseEvaluacion('MENSUAL') }}
                    className={cn(
                      "flex flex-row items-center space-x-3 rounded-md border p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      baseEvaluacion === 'MENSUAL' ? "border-indigo-600 bg-indigo-50/50" : "border-muted bg-popover",
                      (mode === 'view' || tipoCosteo?.enUso) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem value="MENSUAL" id="eval-mensual" />
                    <Label
                      htmlFor="eval-mensual"
                      className="flex-1 cursor-pointer pointer-events-none grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-1 sm:gap-2 sm:items-center"
                    >
                      <span className="font-semibold text-sm">Mensual</span>
                      <span className="text-xs text-slate-500 font-normal leading-tight">
                        Todas las ventas y los costos se mensualizan y la evaluación se hace mensual.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="space-y-3 pt-4 border-t mt-4">
                  <div>
                    <Label className="text-base font-semibold">Manejo Plazo</Label>
                    <p className="text-sm text-slate-500 mb-3">
                      Define cómo se comportará la duración en meses de estos proyectos.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div className="flex flex-col gap-1.5 justify-start">
                        <Select 
                          value={manejoPlazo} 
                          onValueChange={(val) => setManejoPlazo(val as 'LIBRE'|'FIJO'|'NO_APLICA')}
                          disabled={mode === 'view'}
                        >
                          <SelectTrigger id="tc-manejoPlazo" className="w-full bg-white">
                            <SelectValue placeholder="Seleccione el manejo...">
                              {manejoPlazo === 'NO_APLICA' && 'No Aplica'}
                              {manejoPlazo === 'LIBRE' && 'Libre (Editable al crear)'}
                              {manejoPlazo === 'FIJO' && 'Fijo (Forzado a X meses)'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NO_APLICA">No Aplica</SelectItem>
                            <SelectItem value="LIBRE">Libre (Editable al crear)</SelectItem>
                            <SelectItem value="FIJO">Fijo (Forzado a X meses)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(manejoPlazo === 'FIJO' || manejoPlazo === 'LIBRE') && (
                        <div className="flex flex-col w-full justify-start">
                          <div className="flex flex-row items-center gap-3 animate-in fade-in slide-in-from-left-2">
                            <Label htmlFor="tc-fijar-plazo" className="text-sm font-semibold whitespace-nowrap">
                              {manejoPlazo === 'FIJO' ? 'Meses Fijos' : 'Meses Default'}
                            </Label>
                            <NumericInput
                              id="tc-fijar-plazo"
                              value={fijarPlazo || undefined}
                              onChange={(val) => {
                                setFijarPlazo(val || 0)
                                setFieldErrors(prev => ({ ...prev, fijarPlazo: '' }))
                              }}
                              isInteger={true}
                              disabled={mode === 'view'}
                              aria-invalid={!!fieldErrors.fijarPlazo}
                              className="w-full"
                              placeholder="Cantidad de meses..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {fieldErrors.fijarPlazo && <p className="text-xs text-red-500 !mt-0.5 leading-none">{fieldErrors.fijarPlazo}</p>}
                  </div>
                </div>
              </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
            {mode === 'view' ? (
              <>
                {tipoCosteo && (
                  <Button 
                    type="button" 
                    variant={tipoCosteo.activo ? "destructive" : "default"} 
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
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  {mode === 'edit' && tipoCosteo?.enUso && (
                    <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Estructura y Evaluación bloqueadas (en uso).
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end shrink-0">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      if (mode === 'edit') {
                        setEmpresaId(initialTipoCosteo?.empresaId?.toString() ?? '')

                        setNombre(initialTipoCosteo?.nombre ?? '')
                        setCantidadNiveles(initialTipoCosteo?.cantidadNiveles ?? 2)
                        setEtiquetasNiveles(initialTipoCosteo?.etiquetasNiveles ? initialTipoCosteo.etiquetasNiveles.split(',') : ['NIVEL 1', 'NIVEL 2'])
                        setColoresNiveles(initialTipoCosteo?.coloresNiveles ? initialTipoCosteo.coloresNiveles.split(',') : [PREDEFINED_COLORS[0], PREDEFINED_COLORS[0]])
                        setIconosNiveles(initialTipoCosteo?.iconosNiveles ? initialTipoCosteo.iconosNiveles.split(',') : [PREDEFINED_ICONS[0], PREDEFINED_ICONS[0]])
                        setNivelConDireccion(initialTipoCosteo?.nivelConDireccion ?? 1)
                        setLineaEtiqueta(initialTipoCosteo?.lineaEtiqueta ?? '')
                        setBaseEvaluacion(initialTipoCosteo?.baseEvaluacion ?? 'GLOBAL')
                        setManejoPlazo(initialTipoCosteo?.manejoPlazo ?? 'NO_APLICA')
                        setFijarPlazo(initialTipoCosteo?.fijarPlazo ?? 0)
                        setError(null)
                        setMode('view')
                      } else {
                        setOpen(false)
                      }
                    }} 
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
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
