'use client'
/**
 * solicitud-modal.tsx
 *
 * Modal CRUD unificado para Solicitudes de Compra.
 * - Create:  empresa + ítem + cantidad → crea solicitud con estado=1 y scope=GENERAL
 * - View:    muestra todos los campos + tab de cotizaciones
 * - Edit:    permite modificar cantidad
 *
 * Ícono canónico: ClipboardList (el mismo del sidebar)
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  ClipboardList,
  FileText,
  Save,
  Pencil,
  History,
  Trash2,
  Plus,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { UI_THEME } from '@/lib/theme'
import type { SolicitudRow, CotizacionItemRow } from '@/lib/types/cotizaciones'
import {
  labelEstadoSolicitud,
  labelCotizacionScope,
} from '@/lib/constants/cotizaciones'
import {
  crearSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
  listarCotizaciones,
  marcarCotizacionVigente,
  eliminarCotizacion,
  getItemsByEmpresa,
} from '@/app/actions/solicitudes'
import { getEmpresasForUser } from '@/app/actions/erp'
import { CotizacionForm } from './cotizacion-form'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format'

interface SolicitudModalProps {
  solicitud?: SolicitudRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function SolicitudModal({
  solicitud,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: SolicitudModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const isEditing = !!solicitud
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [historialOpen, setHistorialOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // ── Campos del formulario ──────────────────────────────────────────────────
  const [empresaId, setEmpresaId] = useState('')
  const [itemId, setItemId]       = useState('')
  const [scope, setScope]         = useState('GENERAL')
  const [cantidad, setCantidad]   = useState<number | undefined>(0)

  // ── Datos externos ─────────────────────────────────────────────────────────
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [items, setItems]       = useState<{ value: string; label: string; scope: string; unidadMedida: string }[]>([])

  // ── Cotizaciones ───────────────────────────────────────────────────────────
  const [cotizaciones, setCotizaciones]         = useState<CotizacionItemRow[]>([])
  const [cargandoCotizaciones, setCargando]     = useState(false)
  const [mostrarFormNueva, setMostrarFormNueva] = useState(false)
  const [submittingCot, setSubmittingCot]       = useState<number | null>(null)
  const [pendingDeleteCot, setPendingDeleteCot] = useState<number | null>(null)
  const [estadoLocal, setEstadoLocal]           = useState(solicitud?.estado ?? 1)

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false)
  const [globalError, setGlobalError]   = useState<string | null>(null)
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({})

  // ── Cotizaciones helpers ───────────────────────────────────────────────────
  const cargarCotizaciones = useCallback(async () => {
    if (!solicitud) return
    setCargando(true)
    try {
      const data = await listarCotizaciones(solicitud.id)
      setCotizaciones(data)
    } finally {
      setCargando(false)
    }
  }, [solicitud?.id])

  // ── handleOpenChange: inicializa mode + campos — NUNCA en useEffect con deps de datos ──
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMode(isEditing ? 'view' : 'edit')
      setScope(solicitud?.scope ?? 'GENERAL')
      setCantidad(solicitud?.cantidad ?? 0)
      setEmpresaId('')
      setItemId('')
      setEstadoLocal(solicitud?.estado ?? 1)
      setFieldErrors({})
      setGlobalError(null)
      setActiveTab('general')
      setMostrarFormNueva(false)
    }
    setOpen(newOpen)
  }

  // ── useEffect([open]): carga datos externos + reset defensivo (R22) ────────
  useEffect(() => {
    if (!open) return

    // Reset defensivo — solo campos, NUNCA mode (causaría Bug Flash)
    setScope(solicitud?.scope ?? 'GENERAL')
    setCantidad(solicitud?.cantidad ?? 0)
    setEmpresaId('')
    setItemId('')
    setFieldErrors({})
    setGlobalError(null)
    setMostrarFormNueva(false)
    setEstadoLocal(solicitud?.estado ?? 1)

    if (!isEditing) {
      // Modo creación: cargar empresas
      let active = true
      getEmpresasForUser().then(data => {
        if (!active) return
        const sorted = data
          .map(e => ({ value: String(e.id), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(sorted)
        if (sorted.length > 0) setEmpresaId(sorted[0].value)
      })
      return () => { active = false }
    }

    // Modo view/edit: cargar cotizaciones
    cargarCotizaciones()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar ítems cuando cambia la empresa (solo en create) ─────────────────
  useEffect(() => {
    if (!empresaId || isEditing) return
    let active = true
    setItems([])
    setItemId('')
    getItemsByEmpresa(Number(empresaId)).then(data => {
      if (!active) return
      const opts = data.map(i => ({
        value:        String(i.id),
        label:        i.descripcion,
        scope:        i.cotizacionScope ?? 'GENERAL',
        unidadMedida: i.unidadMedida ?? '',
      }))
      setItems(opts)
    })
    return () => { active = false }
  }, [empresaId]) // eslint-disable-line react-hooks/exhaustive-deps


  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = (s?: SolicitudRow) => {
    setScope(s?.scope ?? 'GENERAL')
    setCantidad(s?.cantidad ?? 0)
    setEmpresaId('')
    setItemId('')
    setFieldErrors({})
    setGlobalError(null)
    setActiveTab('general')
    setMostrarFormNueva(false)
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!isEditing) {
      if (!empresaId) errors.empresaId = 'Seleccione una empresa.'
      if (!itemId)    errors.itemId    = 'Seleccione un ítem.'
    }
    const cantidadNum = Number(cantidad)
    if (!cantidadNum || cantidadNum <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a cero.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }))
      return
    }

    setLoading(true)
    try {
      if (isEditing && solicitud) {
        const res = await actualizarSolicitud(solicitud.id, { cantidad: cantidadNum }, solicitud.registroVersion)
        if (!res.ok) { setGlobalError(res.error); return }
        setMode('view')
        onSuccess?.()
      } else {
        const res = await crearSolicitud({
          empresaId: Number(empresaId),
          itemId:    Number(itemId),
          costeoId:  0,
          cantidad:  cantidadNum,
          scope,
        })
        if (!res.ok) { setGlobalError(res.error); return }
        setOpen(false)
        onSuccess?.()
      }
    } catch {
      setGlobalError('Error inesperado del servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Eliminar (DELETE real) ─────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirm('¿Eliminar esta solicitud?\n\nSe eliminarán también todas sus cotizaciones. Esta acción no se puede deshacer.')) return
    setGlobalError(null)
    try {
      const res = await eliminarSolicitud(solicitud!.id)
      if (!res.ok) { setGlobalError(res.error); return }
      setOpen(false)
      onSuccess?.()
    } catch {
      setGlobalError('Error al eliminar la solicitud.')
    }
  }

  // ── Cotizaciones handlers ──────────────────────────────────────────────────
  const handleMarcarVigente = async (cotizacionId: number) => {
    setSubmittingCot(cotizacionId)
    setGlobalError(null)
    try {
      const res = await marcarCotizacionVigente(cotizacionId, solicitud!.id)
      if (!res.ok) { setGlobalError(res.error); return }
      setEstadoLocal(2)
      await cargarCotizaciones()
      onSuccess?.()
    } finally {
      setSubmittingCot(null)
    }
  }

  const handleEliminarCotizacion = async (cotizacionId: number) => {
    if (pendingDeleteCot !== cotizacionId) {
      setPendingDeleteCot(cotizacionId)
      return
    }
    setPendingDeleteCot(null)
    setSubmittingCot(cotizacionId)
    setGlobalError(null)
    try {
      const res = await eliminarCotizacion(cotizacionId)
      if (!res.ok) { setGlobalError(res.error); return }
      await cargarCotizaciones()
      onSuccess?.()
    } finally {
      setSubmittingCot(null)
    }
  }

  const handleCotizacionGuardada = async () => {
    setMostrarFormNueva(false)
    await cargarCotizaciones()
    onSuccess?.()
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const estadoCfg: Record<number, string> = {
    1: 'bg-amber-50 text-amber-700 border-amber-200',
    2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    3: 'bg-red-50 text-red-600 border-red-200',
  }

  const titulo = !isEditing
    ? 'Nueva Solicitud'
    : mode === 'edit'
    ? `Editar Solicitud #${solicitud!.id}`
    : `Solicitud #${solicitud!.id}`

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

        <DialogContent className="h-[85vh] sm:h-[600px] flex flex-col p-4 sm:p-6 overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className={UI_THEME.modal.title}>
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              {titulo}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                  General
                </TabsTrigger>
                {isEditing && (
                  <TabsTrigger value="cotizaciones">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Cotizaciones{cotizaciones.length > 0 ? ` (${cotizaciones.length})` : ''}
                  </TabsTrigger>
                )}
              </TabsList>

              <div className={UI_THEME.modal.scrollArea}>

                {/* Error global */}
                {globalError && (
                  <div className={`${UI_THEME.forms.globalError} mb-4`}>{globalError}</div>
                )}

                {/* ─── Tab General ─── */}
                <TabsContent value="general" className="mt-0 space-y-4">

                  {/* Empresa */}
                  <div className="flex flex-col gap-1.5">
                    <Label className={UI_THEME.forms.labelBase}>
                      Empresa {!isEditing && <span className="text-red-500">*</span>}
                    </Label>
                    {!isEditing ? (
                      <SearchableSelect
                        options={empresas}
                        value={empresaId}
                        onChange={v => {
                          setEmpresaId(v)
                          setItemId('')
                          setFieldErrors(prev => ({ ...prev, empresaId: '' }))
                        }}
                        disabled={loading}
                        placeholder="Seleccionar empresa..."
                      />
                    ) : (
                      <Input
                        value={solicitud!.empresaNombre ?? ''}
                        disabled
                        className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                      />
                    )}
                    <FieldError message={fieldErrors.empresaId} />
                  </div>

                  {/* Ítem */}
                  <div className="flex flex-col gap-1.5">
                    <Label className={UI_THEME.forms.labelBase}>
                      Ítem {!isEditing && <span className="text-red-500">*</span>}
                    </Label>
                    {!isEditing ? (
                      <SearchableSelect
                        options={items.map(i => ({ value: i.value, label: i.label }))}
                        value={itemId}
                        onChange={setItemId}
                        disabled={!empresaId || loading}
                        placeholder={
                          !empresaId        ? 'Seleccione empresa primero...' :
                          items.length === 0 ? 'Sin ítems disponibles' :
                                              'Seleccionar ítem...'
                        }
                      />
                    ) : (
                      <Input
                        value={solicitud!.itemDescripcion}
                        disabled
                        className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                      />
                    )}
                    <FieldError message={fieldErrors.itemId} />
                  </div>

                  {/* Cantidad + Medida — cada campo ocupa 1/4 de la fila */}
                  <div className="grid grid-cols-4 gap-4 items-start">

                    {/* Cantidad */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>
                        Cantidad <span className="text-red-500">*</span>
                      </Label>
                      {mode === 'view' ? (
                        <Input
                          value={formatNumber(Number(solicitud?.cantidad ?? 0))}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      ) : (
                        <NumericInput
                          value={cantidad}
                          onChange={setCantidad}
                          disabled={loading}
                          placeholder="0.0000"
                          className={UI_THEME.forms.inputBase}
                        />
                      )}
                      <FieldError message={fieldErrors.cantidad} />
                    </div>

                    {/* Medida */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Medida</Label>
                      <div className={`flex items-center h-8 w-full rounded-md border border-input bg-muted/50 px-3 ${UI_THEME.forms.inputBase}`}>
                        {(() => {
                          const um = isEditing
                            ? (solicitud?.itemUnidadMedida ?? '')
                            : (items.find(i => i.value === itemId)?.unidadMedida ?? '')
                          return um ? (
                            <span className="text-xs font-medium text-slate-600">{um}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>
                        })()}
                      </div>
                    </div>

                    {/* cols 3 y 4 vacías intencionalmente */}
                  </div>

                  {/* Tipo (scope) — no editable; solo visible en view/edit */}
                  {isEditing && (
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Tipo</Label>
                      <Input
                        value={labelCotizacionScope(solicitud?.scope)}
                        disabled
                        className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                      />
                    </div>
                  )}

                  {/* Estado (solo en view/edit) */}
                  {isEditing && (
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Estado</Label>
                      <div className="flex items-center h-8">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${estadoCfg[estadoLocal] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {labelEstadoSolicitud(estadoLocal)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Fecha (solo en view/edit) */}
                  {isEditing && (
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Fecha</Label>
                      <Input
                        value={formatDate(solicitud!.fecha)}
                        disabled
                        className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                      />
                    </div>
                  )}

                </TabsContent>

                {/* ─── Tab Cotizaciones ─── */}
                {isEditing && (
                  <TabsContent value="cotizaciones" className="mt-0">

                    {/* Cabecera */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${estadoCfg[estadoLocal] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {labelEstadoSolicitud(estadoLocal)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      {!mostrarFormNueva && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setMostrarFormNueva(true)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nueva Cotización
                        </Button>
                      )}
                    </div>

                    {/* Formulario nueva cotización */}
                    {mostrarFormNueva && (
                      <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                        <p className="text-xs font-semibold text-indigo-700 mb-3 flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Registrar Cotización
                        </p>
                        <CotizacionForm
                          solicitudId={solicitud!.id}
                          onGuardado={handleCotizacionGuardada}
                          onCancelar={() => setMostrarFormNueva(false)}
                        />
                      </div>
                    )}

                    {/* Lista de cotizaciones */}
                    {cargandoCotizaciones ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
                    ) : cotizaciones.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground italic">
                        No hay cotizaciones registradas para esta solicitud.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cotizaciones.map(cot => (
                          <div
                            key={cot.id}
                            className={`rounded-lg border p-4 space-y-3 ${
                              cot.vigente === 1
                                ? 'border-emerald-300 bg-emerald-50/60'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{cot.proveedorNombre}</span>
                                  {cot.vigente === 1 && (
                                    <span className={UI_THEME.badge.active}>
                                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                      Vigente
                                    </span>
                                  )}
                                </div>
                                {cot.referencia && (
                                  <p className="text-xs text-muted-foreground">Ref: {cot.referencia}</p>
                                )}
                                <p className="text-xs text-muted-foreground">Fecha: {cot.fecha}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {cot.vigente !== 1 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    disabled={submittingCot === cot.id}
                                    onClick={() => handleMarcarVigente(cot.id)}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Marcar Vigente
                                  </Button>
                                )}
                                {pendingDeleteCot === cot.id ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs text-red-600 border-red-400 bg-red-50 hover:bg-red-100 font-medium"
                                      disabled={submittingCot === cot.id}
                                      onClick={() => handleEliminarCotizacion(cot.id)}
                                    >
                                      ¿Eliminar?
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setPendingDeleteCot(null)}
                                    >
                                      No
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={submittingCot === cot.id}
                                    onClick={() => handleEliminarCotizacion(cot.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Montos */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-white rounded border border-slate-100 p-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cantidad</p>
                                <p className="text-sm font-medium">{formatCurrency(cot.cantidad, 2)}</p>
                              </div>
                              <div className="bg-white rounded border border-slate-100 p-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                                <p className="text-sm font-medium">{formatCurrency(cot.total, 2)}</p>
                              </div>
                              <div className={`rounded border p-2 ${cot.vigente === 1 ? 'bg-emerald-100 border-emerald-200' : 'bg-white border-slate-100'}`}>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Costo Unitario</p>
                                <p className={`text-sm font-bold ${cot.vigente === 1 ? 'text-emerald-800' : ''}`}>
                                  {formatCurrency(cot.costoUnitario, 4)}
                                </p>
                              </div>
                            </div>

                            {/* Comentario + PDF */}
                            <div className="flex items-center justify-between">
                              {cot.comentario ? (
                                <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mr-2">{cot.comentario}</p>
                              ) : <span />}
                              {cot.archivoUrl && (
                                <a
                                  href={cot.archivoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {cot.archivoNombre ?? 'Ver PDF'}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}

              </div>
            </Tabs>

            {/* ─── Footer fijo ─── */}
            <div className={UI_THEME.modal.footer}>
              <div>
                {/* Modo Vista: Eliminar a la izquierda */}
                {isEditing && mode === 'view' && (
                  <Button
                    type="button"
                    variant="outline"
                    className={UI_THEME.modal.buttons.eliminar}
                    onClick={handleEliminar}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Eliminar
                  </Button>
                )}
              </div>

              <div className={UI_THEME.modal.buttons.rightGroup}>
                {/* Modo Vista: Historial + Editar */}
                {mode === 'view' && isEditing && (
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

                {/* Modo Edit/Create: Cancelar + Guardar */}
                {mode === 'edit' && (
                  <>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { resetForm(solicitud); setMode('view') }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* HistorialDrawer — FUERA del Dialog, como hermano en el fragmento */}
      {solicitud && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={solicitud.id}
          entidadTipo="Solicitud Compra"
          tabla="costeos_solicitud_compra"
        />
      )}
    </>
  )
}
