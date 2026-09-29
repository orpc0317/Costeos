'use client'
/**
 * cotizacion-form.tsx
 * Formulario para agregar una nueva cotización a una solicitud existente.
 * Campos: proveedor, fecha, referencia, cantidad, total (costoUnitario calculado),
 * impuestos, comentario, archivo PDF y marcarVigente.
 */
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { NumericInput } from '@/components/ui/numeric-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, X } from 'lucide-react'
import { listarProveedores } from '@/app/actions/proveedores'
import { registrarCotizacion } from '@/app/actions/solicitudes'
import { UI_THEME } from '@/lib/theme'

interface CotizacionFormProps {
  solicitudId: number
  onGuardado: () => void
  onCancelar: () => void
}

export function CotizacionForm({ solicitudId, onGuardado, onCancelar }: CotizacionFormProps) {
  const [proveedorId, setProveedorId]   = useState('')
  const [referencia, setReferencia]     = useState('')
  const [fecha, setFecha]               = useState(new Date().toISOString().split('T')[0])
  const [cantidad, setCantidad]         = useState<number | undefined>(undefined)
  const [total, setTotal]               = useState<number | undefined>(undefined)
  const [impuestos, setImpuestos]       = useState(false)
  const [comentario, setComentario]     = useState('')
  const [marcarVigente, setMarcarVigente] = useState(true)

  const [archivo, setArchivo]           = useState<File | null>(null)

  const [proveedores, setProveedores]   = useState<{ value: string; label: string }[]>([])
  const [cargandoProveedores, setCargandoProveedores] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [globalError, setGlobalError]   = useState<string | null>(null)
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({})

  // Costo unitario calculado (solo display)
  const costoUnitario = cantidad && total && cantidad > 0 ? total / cantidad : 0

  useEffect(() => {
    let active = true
    setCargandoProveedores(true)
    listarProveedores().then(data => {
      if (!active) return
      const options = data
        .map(p => ({ value: String(p.id), label: p.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setProveedores(options)
    }).finally(() => {
      if (active) setCargandoProveedores(false)
    })
    return () => { active = false }
  }, [])

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

  const handleSubmit = async () => {
    setFieldErrors({})
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!proveedorId)               errors.proveedorId = 'Selecciona un proveedor'
    if (!fecha)                     errors.fecha       = 'Ingresa la fecha de la cotización'
    if (!cantidad || cantidad <= 0) errors.cantidad    = 'Cantidad debe ser mayor a 0'
    if (!total    || total    <= 0) errors.total       = 'Total debe ser mayor a 0'

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setSubmitting(true)
    try {
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
        const uData = await uploadRes.json()
        archivoUrl    = uData.url
        archivoNombre = uData.nombre
      }

      const res = await registrarCotizacion({
        solicitudId,
        proveedorId:   Number(proveedorId),
        referencia:    referencia || null,
        fecha,
        cantidad:      cantidad!,
        total:         total!,
        impuestos:     impuestos ? 1 : 0,
        comentario:    comentario || null,
        marcarVigente,
        archivoUrl,
        archivoNombre,
      })

      if (!res.ok) {
        setGlobalError(res.error)
        setSubmitting(false)
        return
      }

      onGuardado()
    } catch (err: any) {
      setGlobalError(err.message || 'Error al guardar la cotización')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {globalError && (
        <div className={UI_THEME.forms.globalError}>{globalError}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Proveedor */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Proveedor *</Label>
          <SearchableSelect
            options={proveedores}
            value={proveedorId}
            onChange={setProveedorId}
            disabled={cargandoProveedores || submitting}
          />
          <FieldError message={fieldErrors.proveedorId} />
        </div>

        {/* Fecha */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Fecha Cotización *</Label>
          <Input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={submitting}
            className={UI_THEME.forms.inputBase}
          />
          <FieldError message={fieldErrors.fecha} />
        </div>

        {/* Referencia */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Referencia</Label>
          <Input
            value={referencia}
            onChange={e => setReferencia(e.target.value)}
            placeholder="Ej. COT-2024-001"
            maxLength={100}
            disabled={submitting}
            className={UI_THEME.forms.inputBase}
          />
        </div>

        {/* Comentario */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Comentario</Label>
          <Input
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Máx. 15 caracteres"
            maxLength={15}
            disabled={submitting}
            className={UI_THEME.forms.inputBase}
          />
        </div>

        {/* Cantidad */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Cantidad *</Label>
          <NumericInput
            value={cantidad}
            onChange={setCantidad}
            disabled={submitting}
            placeholder="0.0000"
            className={UI_THEME.forms.inputBase}
          />
          <FieldError message={fieldErrors.cantidad} />
        </div>

        {/* Total */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Total *</Label>
          <NumericInput
            value={total}
            onChange={setTotal}
            disabled={submitting}
            placeholder="0.0000"
            className={UI_THEME.forms.inputBase}
          />
          <FieldError message={fieldErrors.total} />
        </div>

        {/* Costo Unitario */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Costo Unitario</Label>
          <Input
            value={costoUnitario > 0 ? costoUnitario.toFixed(4) : '0.0000'}
            disabled
            className={`${UI_THEME.forms.inputBase} bg-muted/50 font-medium text-emerald-700`}
          />
        </div>

        {/* Impuestos */}
        <div className="col-span-1 flex items-center gap-2 pt-5">
          <Checkbox
            id="impuestos"
            checked={impuestos}
            onCheckedChange={(c) => setImpuestos(!!c)}
            disabled={submitting}
          />
          <Label htmlFor="impuestos" className="cursor-pointer font-medium">
            Incluye Impuestos
          </Label>
        </div>

        {/* Archivo PDF */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className={UI_THEME.forms.labelBase}>Archivo PDF</Label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {archivo && <p className="text-xs text-muted-foreground ml-1">Seleccionado: {archivo.name}</p>}
          <FieldError message={fieldErrors.archivo} />
        </div>

        {/* Marcar Vigente */}
        <div className="col-span-2">
          <div className="flex items-center space-x-2 bg-white p-3 border rounded-md">
            <Checkbox
              id="marcarVigente"
              checked={marcarVigente}
              onCheckedChange={(c) => setMarcarVigente(!!c)}
              disabled={submitting}
            />
            <Label htmlFor="marcarVigente" className="font-medium cursor-pointer">
              Marcar como cotización vigente para este ítem
            </Label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={submitting}>
          <X className="w-4 h-4 mr-1.5" />
          Cancelar
        </Button>
        <Button type="button" disabled={submitting} onClick={handleSubmit}>
          <Save className="w-4 h-4 mr-1.5" />
          {submitting ? 'Guardando...' : 'Guardar Cotización'}
        </Button>
      </div>
    </div>
  )
}
