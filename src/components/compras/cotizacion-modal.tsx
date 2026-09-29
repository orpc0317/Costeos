'use client'
/**
 * cotizacion-modal.tsx
 *
 * Modal CRUD unificado para CotizacionItem (pantalla /dashboard/compras/cotizaciones).
 * - Create:  empresa + ítem + proveedor + fecha + cantidad + total + impuestos + comentario + PDF
 *           → crea automáticamente una SolicitudCotizacion GENERAL (costeoId=0)
 * - View:    muestra todos los campos + tab Solicitud con datos del padre
 * - Edit:    permite editar referencia, fecha, cantidad, total, impuestos, comentario
 *
 * Ícono canónico: FileText (el mismo del sidebar para Cotizaciones)
 */
import React, { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { UI_THEME } from '@/lib/theme'
import {
  FileText,
  ClipboardList,
  Save,
  Pencil,
  History,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import type { CotizacionRow } from '@/lib/types/cotizaciones'
import { labelEstadoSolicitud } from '@/lib/constants/cotizaciones'
import {
  crearCotizacionDirecta,
  actualizarCotizacion,
  marcarCotizacionVigente,
  getItemsByEmpresa,
} from '@/app/actions/solicitudes'
import { getEmpresasForUser } from '@/app/actions/erp'
import { listarProveedores } from '@/app/actions/proveedores'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CotizacionModalProps {
  cotizacion?: CotizacionRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const estadoSolicitudCfg: Record<number, string> = {
  1: 'bg-amber-50 text-amber-700 border-amber-200',
  2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  3: 'bg-red-50 text-red-600 border-red-200',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CotizacionModal({
  cotizacion,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: CotizacionModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open    = isControlled ? controlledOpen  : internalOpen
  const setOpen = isControlled ? onOpenChange!    : setInternalOpen

  const isEditing = !!cotizacion
  const [mode, setMode]             = useState<'view' | 'edit'>('view')
  const [historialOpen, setHistorialOpen] = useState(false)
  const [activeTab, setActiveTab]   = useState('general')

  // ── Campos del formulario ──────────────────────────────────────────────────
  const [empresaId, setEmpresaId]   = useState('')
  const [itemId, setItemId]         = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [cantidad, setCantidad]     = useState<number | undefined>(undefined)
  const [total, setTotal]           = useState<number | undefined>(undefined)
  const [impuestos, setImpuestos]   = useState(false)
  const [comentario, setComentario] = useState('')
  const [marcarVigente, setMarcarVigente] = useState(true)
  const [archivo, setArchivo]       = useState<File | null>(null)

  // ── Datos externos ─────────────────────────────────────────────────────────
  const [empresas,   setEmpresas]   = useState<{ value: string; label: string }[]>([])
  const [items,      setItems]      = useState<{ value: string; label: string }[]>([])
  const [proveedores, setProveedores] = useState<{ value: string; label: string }[]>([])

  // ── Estados locales para reflect inmediato en vista ───────────────────────
  const [vigenteLocal, setVigenteLocal]               = useState(cotizacion?.vigente ?? 0)
  const [solicitudEstadoLocal, setSolicitudEstadoLocal] = useState(cotizacion?.solicitudEstado ?? 1)

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submittingVigente, setSubmittingVigente] = useState(false)

  // ── Costo unitario calculado (solo display en crear/editar) ────────────────
  const costoUnitarioCalc = (cantidad && total && cantidad > 0) ? total / cantidad : 0

  // ── CRÍTICO: inicialización en handleOpenChange (NUNCA en useEffect con deps de datos) ──
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMode(isEditing ? 'view' : 'edit')
      setActiveTab('general')
      setGlobalError(null)
      setFieldErrors({})
      setArchivo(null)

      if (isEditing && cotizacion) {
        // Modo view/edit: inicializar campos con datos existentes
        setEmpresaId(cotizacion.empresaId?.toString() ?? '')
        setItemId('')
        setProveedorId(cotizacion.proveedorId?.toString() ?? '')
        setReferencia(cotizacion.referencia ?? '')
        setFecha(cotizacion.fecha ?? new Date().toISOString().split('T')[0])
        setCantidad(cotizacion.cantidad)
        setTotal(cotizacion.total)
        setImpuestos(cotizacion.impuestos === 1)
        setComentario(cotizacion.comentario ?? '')
        setMarcarVigente(false)
        setVigenteLocal(cotizacion.vigente)
        setSolicitudEstadoLocal(cotizacion.solicitudEstado ?? 1)
      } else {
        // Modo crear: resetear todo
        setEmpresaId('')
        setItemId('')
        setProveedorId('')
        setReferencia('')
        setFecha(new Date().toISOString().split('T')[0])
        setCantidad(undefined)
        setTotal(undefined)
        setImpuestos(false)
        setComentario('')
        setMarcarVigente(true)
        setVigenteLocal(0)
        setSolicitudEstadoLocal(1)
      }
    }
    setOpen(newOpen)
  }

  // ── useEffect([open]): carga datos externos + reset defensivo (R22) ────────
  useEffect(() => {
    if (!open) return

    // Reset defensivo — solo campos, NUNCA mode (causaría Bug Flash)
    setGlobalError(null)
    setFieldErrors({})
    setArchivo(null)
    setActiveTab('general')

    if (isEditing && cotizacion) {
      setReferencia(cotizacion.referencia ?? '')
      setFecha(cotizacion.fecha ?? new Date().toISOString().split('T')[0])
      setCantidad(cotizacion.cantidad)
      setTotal(cotizacion.total)
      setImpuestos(cotizacion.impuestos === 1)
      setComentario(cotizacion.comentario ?? '')
      setVigenteLocal(cotizacion.vigente)
      setSolicitudEstadoLocal(cotizacion.solicitudEstado ?? 1)
    } else {
      setEmpresaId('')
      setItemId('')
      setProveedorId('')
      setReferencia('')
      setFecha(new Date().toISOString().split('T')[0])
      setCantidad(undefined)
      setTotal(undefined)
      setImpuestos(false)
      setComentario('')
      setMarcarVigente(true)
    }

    // Cargar proveedores (siempre)
    let active = true
    listarProveedores().then(data => {
      if (!active) return
      const opts = data
        .map(p => ({ value: String(p.id), label: p.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setProveedores(opts)
    })

    if (!isEditing) {
      // Cargar empresas solo en modo crear
      getEmpresasForUser().then(data => {
        if (!active) return
        const opts = data
          .map(e => ({ value: String(e.id), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(opts)
        if (opts.length > 0) setEmpresaId(opts[0].value)
      })
    }

    return () => { active = false }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar ítems cuando cambia la empresa (solo crear) ─────────────────────
  useEffect(() => {
    if (!empresaId || isEditing) return
    let active = true
    setItems([])
    setItemId('')
    getItemsByEmpresa(Number(empresaId)).then(data => {
      if (!active) return
      const opts = data
        .map(i => ({ value: String(i.id), label: i.descripcion }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setItems(opts)
    })
    return () => { active = false }
  }, [empresaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── File handler ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) { setArchivo(null); return }
    if (f.type !== 'application/pdf') {
      setFieldErrors(prev => ({ ...prev, archivo: 'Solo se permiten archivos PDF.' }))
      setArchivo(null); return
    }
    if (f.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, archivo: 'El archivo no puede superar los 10 MB.' }))
      setArchivo(null); return
    }
    setFieldErrors(prev => ({ ...prev, archivo: '' }))
    setArchivo(f)
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    // Validaciones
    const errors: Record<string, string> = {}
    if (!isEditing) {
      if (!empresaId)   errors.empresaId   = 'Seleccione una empresa'
      if (!itemId)      errors.itemId      = 'Seleccione un ítem'
    }
    if (!proveedorId || (isEditing && !cotizacion?.proveedorId)) {
      if (!isEditing && !proveedorId) errors.proveedorId = 'Seleccione un proveedor'
    }
    if (!fecha)                            errors.fecha     = 'Ingrese la fecha'
    if (!cantidad || cantidad <= 0)        errors.cantidad  = 'La cantidad debe ser mayor a 0'
    if (!total    || total    <= 0)        errors.total     = 'El total debe ser mayor a 0'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }))
      return
    }

    setLoading(true)
    try {
      if (isEditing && cotizacion) {
        // Modo edición: solo actualizar campos editables
        const res = await actualizarCotizacion(
          cotizacion.id,
          {
            referencia: referencia || null,
            fecha,
            cantidad: cantidad!,
            total:    total!,
            impuestos: impuestos ? 1 : 0,
            comentario: comentario || null,
          },
          cotizacion.registroVersion,
        )
        if (!res.ok) { setGlobalError(res.error); return }
        setMode('view')
        onSuccess?.()
      } else {
        // Modo crear: subir PDF si hay, luego crear cotización directa
        let archivoUrl    = null
        let archivoNombre = null

        if (archivo) {
          const formData = new FormData()
          formData.append('file', archivo)
          const uploadRes = await fetch('/api/cotizaciones/upload', { method: 'POST', body: formData })
          if (!uploadRes.ok) {
            const uErr = await uploadRes.json()
            throw new Error(uErr.error || 'Error al subir el archivo PDF')
          }
          const uData   = await uploadRes.json()
          archivoUrl    = uData.url
          archivoNombre = uData.nombre
        }

        const res = await crearCotizacionDirecta({
          empresaId:    Number(empresaId),
          itemId:       Number(itemId),
          proveedorId:  Number(proveedorId),
          referencia:   referencia || null,
          fecha,
          cantidad:     cantidad!,
          total:        total!,
          impuestos:    impuestos ? 1 : 0,
          comentario:   comentario || null,
          archivoUrl,
          archivoNombre,
          marcarVigente,
        })
        if (!res.ok) {
          if (res.field) setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
          else setGlobalError(res.error)
          return
        }
        setOpen(false)
        onSuccess?.()
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error inesperado del servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Marcar vigente ─────────────────────────────────────────────────────────
  const handleMarcarVigente = async () => {
    if (!cotizacion) return
    setSubmittingVigente(true)
    setGlobalError(null)
    try {
      if (cotizacion.solicitudId != null) {
        // Tiene solicitud padre → actualiza cotización Y solicitud
        const res = await marcarCotizacionVigente(cotizacion.id, cotizacion.solicitudId)
        if (!res.ok) { setGlobalError(res.error); return }
        setSolicitudEstadoLocal(2)
      } else {
        // Cotización directa → solo marcar vigente en la BD (sin solicitud padre)
        const res = await marcarCotizacionVigente(cotizacion.id, 0)
        if (!res.ok) { setGlobalError(res.error); return }
      }
      setVigenteLocal(1)
      onSuccess?.()
    } finally {
      setSubmittingVigente(false)
    }
  }

  // ── Título dinámico ────────────────────────────────────────────────────────
  const titulo = !isEditing
    ? 'Nueva Cotización'
    : mode === 'edit'
    ? `Editar Cotización #${cotizacion!.id}`
    : `Cotización #${cotizacion!.id}`

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

        <DialogContent className="h-[85vh] sm:h-[640px] flex flex-col p-4 sm:p-6 overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className={UI_THEME.modal.title}>
              <FileText className="h-5 w-5 text-indigo-600" />
              {titulo}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  General
                </TabsTrigger>
                {isEditing && (
                  <TabsTrigger value="solicitud">
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Solicitud
                  </TabsTrigger>
                )}
              </TabsList>

              <div className={UI_THEME.modal.scrollArea}>

                {/* Error global */}
                {globalError && (
                  <div className={`${UI_THEME.forms.globalError} mb-4`}>{globalError}</div>
                )}

                {/* ─── Tab General ─── */}
                <TabsContent value="general" className="mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    {/* Empresa */}
                    <div className="flex flex-col gap-1.5 col-span-2">
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
                          error={!!fieldErrors.empresaId}
                        />
                      ) : (
                        <Input
                          value={cotizacion!.empresaNombre ?? ''}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      )}
                      <FieldError message={fieldErrors.empresaId} />
                    </div>

                    {/* Ítem */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label className={UI_THEME.forms.labelBase}>
                        Ítem {!isEditing && <span className="text-red-500">*</span>}
                      </Label>
                      {!isEditing ? (
                        <SearchableSelect
                          options={items}
                          value={itemId}
                          onChange={v => {
                            setItemId(v)
                            setFieldErrors(prev => ({ ...prev, itemId: '' }))
                          }}
                          disabled={!empresaId || loading}
                          placeholder={
                            !empresaId         ? 'Seleccione empresa primero...' :
                            items.length === 0 ? 'Sin ítems disponibles' :
                                                 'Seleccionar ítem...'
                          }
                          error={!!fieldErrors.itemId}
                        />
                      ) : (
                        <Input
                          value={cotizacion!.itemDescripcion ?? ''}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      )}
                      <FieldError message={fieldErrors.itemId} />
                    </div>

                    {/* Proveedor */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label className={UI_THEME.forms.labelBase}>
                        Proveedor {!isEditing && <span className="text-red-500">*</span>}
                      </Label>
                      {!isEditing ? (
                        <SearchableSelect
                          options={proveedores}
                          value={proveedorId}
                          onChange={v => {
                            setProveedorId(v)
                            setFieldErrors(prev => ({ ...prev, proveedorId: '' }))
                          }}
                          disabled={loading}
                          placeholder="Seleccionar proveedor..."
                          error={!!fieldErrors.proveedorId}
                        />
                      ) : (
                        <Input
                          value={cotizacion!.proveedorNombre ?? ''}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      )}
                      <FieldError message={fieldErrors.proveedorId} />
                    </div>

                    {/* Vigente (solo en vista) */}
                    {isEditing && (
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label className={UI_THEME.forms.labelBase}>Estado Vigente</Label>
                        <div className="flex items-center h-8">
                          {vigenteLocal === 1 ? (
                            <span className={UI_THEME.badge.active}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Vigente
                            </span>
                          ) : (
                            <span className={UI_THEME.badge.inactive}>
                              No Vigente
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fecha */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>
                        Fecha <span className="text-red-500">*</span>
                      </Label>
                      {mode === 'view' ? (
                        <Input
                          value={formatDate(cotizacion?.fecha ?? '')}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      ) : (
                        <Input
                          type="date"
                          value={fecha}
                          onChange={e => setFecha(e.target.value)}
                          disabled={loading}
                          className={UI_THEME.forms.inputBase}
                        />
                      )}
                      <FieldError message={fieldErrors.fecha} />
                    </div>

                    {/* Referencia */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Referencia</Label>
                      <Input
                        value={referencia}
                        onChange={e => setReferencia(e.target.value)}
                        placeholder="Ej. COT-2024-001"
                        maxLength={100}
                        disabled={mode === 'view' || loading}
                        className={`${UI_THEME.forms.inputBase}${mode === 'view' ? ' bg-muted/50' : ''}`}
                      />
                    </div>

                    {/* Cantidad */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>
                        Cantidad <span className="text-red-500">*</span>
                      </Label>
                      {mode === 'view' ? (
                        <Input
                          value={formatNumber(Number(cotizacion?.cantidad ?? 0))}
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

                    {/* Total */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>
                        Total <span className="text-red-500">*</span>
                      </Label>
                      {mode === 'view' ? (
                        <Input
                          value={formatNumber(Number(cotizacion?.total ?? 0))}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      ) : (
                        <NumericInput
                          value={total}
                          onChange={setTotal}
                          disabled={loading}
                          placeholder="0.0000"
                          className={UI_THEME.forms.inputBase}
                        />
                      )}
                      <FieldError message={fieldErrors.total} />
                    </div>

                    {/* Costo Unitario */}
                    <div className="flex flex-col gap-1.5">
                      <Label className={UI_THEME.forms.labelBase}>Costo Unitario</Label>
                      <Input
                        value={
                          mode === 'view'
                            ? formatCurrency(cotizacion?.costoUnitario ?? 0, 4)
                            : costoUnitarioCalc > 0
                            ? costoUnitarioCalc.toFixed(4)
                            : '0.0000'
                        }
                        disabled
                        className={`${UI_THEME.forms.inputBase} bg-muted/50 font-medium text-emerald-700`}
                      />
                    </div>

                    {/* Incluye Impuestos */}
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox
                        id="cot-impuestos"
                        checked={impuestos}
                        onCheckedChange={c => setImpuestos(!!c)}
                        disabled={mode === 'view' || loading}
                      />
                      <Label htmlFor="cot-impuestos" className="cursor-pointer font-medium text-sm">
                        Incluye Impuestos
                      </Label>
                    </div>

                    {/* Comentario */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <Label className={UI_THEME.forms.labelBase}>Comentario</Label>
                      <textarea
                        value={comentario}
                        onChange={e => setComentario(e.target.value)}
                        placeholder="Comentario..."
                        rows={3}
                        disabled={mode === 'view' || loading}
                        className={`${UI_THEME.forms.inputBase} resize-none overflow-y-auto py-1.5 leading-snug${mode === 'view' ? ' bg-muted/50' : ''}`}
                      />
                    </div>

                    {/* Archivo PDF */}
                    {mode !== 'view' && !isEditing && (
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label className={UI_THEME.forms.labelBase}>Archivo PDF</Label>
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          disabled={loading}
                          className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {archivo && (
                          <p className="text-xs text-muted-foreground ml-1">
                            Seleccionado: {archivo.name}
                          </p>
                        )}
                        <FieldError message={fieldErrors.archivo} />
                      </div>
                    )}

                    {/* Enlace PDF en vista */}
                    {isEditing && mode === 'view' && cotizacion?.archivoUrl && (
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label className={UI_THEME.forms.labelBase}>Archivo PDF</Label>
                        <a
                          href={cotizacion.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {cotizacion.archivoNombre ?? 'Ver PDF'}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Marcar Vigente — solo en modo crear */}
                    {!isEditing && (
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2 bg-white p-3 border rounded-md">
                          <Checkbox
                            id="cot-vigente"
                            checked={marcarVigente}
                            onCheckedChange={c => setMarcarVigente(!!c)}
                            disabled={loading}
                          />
                          <Label htmlFor="cot-vigente" className="font-medium cursor-pointer">
                            Marcar como cotización vigente para este ítem
                          </Label>
                        </div>
                      </div>
                    )}

                  </div>
                </TabsContent>

                {/* ─── Tab Solicitud ─── */}
                {isEditing && (
                  <TabsContent value="solicitud" className="mt-0">
                    <div className="space-y-4">

                      {/* Estado solicitud */}
                      <div className="flex flex-col gap-1.5">
                        <Label className={UI_THEME.forms.labelBase}>Estado Solicitud</Label>
                        <div className="flex items-center h-8">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${estadoSolicitudCfg[solicitudEstadoLocal] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                          >
                            {labelEstadoSolicitud(solicitudEstadoLocal)}
                          </span>
                        </div>
                      </div>

                      {/* Empresa */}
                      <div className="flex flex-col gap-1.5">
                        <Label className={UI_THEME.forms.labelBase}>Empresa</Label>
                        <Input
                          value={cotizacion!.empresaNombre ?? ''}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      </div>

                      {/* Ítem */}
                      <div className="flex flex-col gap-1.5">
                        <Label className={UI_THEME.forms.labelBase}>Ítem</Label>
                        <Input
                          value={cotizacion!.itemDescripcion ?? ''}
                          disabled
                          className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                        />
                      </div>

                      {/* Unidad medida */}
                      {cotizacion!.itemUnidadMedida && (
                        <div className="flex flex-col gap-1.5">
                          <Label className={UI_THEME.forms.labelBase}>Unidad Medida</Label>
                          <Input
                            value={cotizacion!.itemUnidadMedida}
                            disabled
                            className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                          />
                        </div>
                      )}

                      {/* ID Solicitud */}
                      {cotizacion!.solicitudId != null && (
                        <div className="flex flex-col gap-1.5">
                          <Label className={UI_THEME.forms.labelBase}>ID Solicitud</Label>
                          <Input
                            value={cotizacion!.solicitudId}
                            disabled
                            className={`${UI_THEME.forms.inputBase} bg-muted/50 font-mono`}
                          />
                        </div>
                      )}

                      {/* Cliente (si viene de costeo) */}
                      {cotizacion!.clienteNombre && (
                        <div className="flex flex-col gap-1.5">
                          <Label className={UI_THEME.forms.labelBase}>Cliente</Label>
                          <Input
                            value={cotizacion!.clienteNombre}
                            disabled
                            className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                          />
                        </div>
                      )}

                      {/* Proyecto / Contrato (si viene de costeo) */}
                      {cotizacion!.proyectoNombre && (
                        <div className="flex flex-col gap-1.5">
                          <Label className={UI_THEME.forms.labelBase}>Proyecto</Label>
                          <Input
                            value={cotizacion!.proyectoNombre}
                            disabled
                            className={`${UI_THEME.forms.inputBase} bg-muted/50`}
                          />
                        </div>
                      )}

                    </div>
                  </TabsContent>
                )}

              </div>
            </Tabs>

            {/* ─── Footer fijo ─── */}
            <div className={UI_THEME.modal.footer}>
              <div>
                {/* Modo Vista: Marcar Vigente a la izquierda si no es vigente */}
                {isEditing && mode === 'view' && vigenteLocal !== 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    className={UI_THEME.modal.buttons.accionEspecial}
                    onClick={handleMarcarVigente}
                    disabled={submittingVigente}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {submittingVigente ? 'Procesando...' : 'Marcar Vigente'}
                  </Button>
                )}
              </div>

              <div className={UI_THEME.modal.buttons.rightGroup}>
                {/* Modo Vista */}
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
                    <Button
                      type="button"
                      onClick={() => setMode('edit')}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </>
                )}

                {/* Modo Editar/Crear */}
                {mode === 'edit' && (
                  <>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Reset campos al estado original del cotizacion
                          setReferencia(cotizacion!.referencia ?? '')
                          setFecha(cotizacion!.fecha ?? new Date().toISOString().split('T')[0])
                          setCantidad(cotizacion!.cantidad)
                          setTotal(cotizacion!.total)
                          setImpuestos(cotizacion!.impuestos === 1)
                          setComentario(cotizacion!.comentario ?? '')
                          setGlobalError(null)
                          setFieldErrors({})
                          setMode('view')
                        }}
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
      {cotizacion && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={cotizacion.id}
          entidadTipo="Cotización"
          tabla="costeos_cotizacion"
        />
      )}
    </>
  )
}
