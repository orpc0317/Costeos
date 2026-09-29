'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { Truck, Save, Pencil, History, Search, ArrowLeft } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearProveedor, actualizarProveedor, buscarProveedoresSimilares } from '@/app/actions/proveedores'
import type { ProveedorSimilarConOrigen } from '@/app/actions/proveedores'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import { isConsumidorFinal, normalizeNIT, validateNIT } from '@/lib/utils/nit'
import type { ProveedorInput, ProveedorRow } from '@/lib/types/proveedores'
import type { ErpProveedor } from '@/lib/erp'
import { UI_THEME } from '@/lib/theme'

interface ProveedorModalProps {
  proveedor?: ProveedorRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const MIN_BUSQUEDA_CHARS = 3
type ProveedorModalStep = 'busqueda' | 'formulario'
type TipoBusqueda = 'nombre' | 'nit'

export function ProveedorModal({ proveedor, trigger, open: controlledOpen, onOpenChange }: ProveedorModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!proveedor
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Wizard (solo para nuevos)
  const [step, setStep] = useState<ProveedorModalStep>('busqueda')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ProveedorSimilarConOrigen[]>([])
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('nombre')
  const [textoBusqueda, setTextoBusqueda] = useState('')

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState<string>('')
  const [nit, setNit] = useState('')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [codigoErp, setCodigoErp] = useState<string | null>(null)

  // ERP vinculado (campos pre-poblados, read-only)
  const [erpVinculado, setErpVinculado] = useState<ErpProveedor | null>(null)

  // Errores y estado
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Empresas
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  // Cargar empresas cuando abre. NO tocar `mode` aquí.
  useEffect(() => {
    if (open) {
      // ── Reset defensivo (R22) ──
      const p = proveedor ?? null
      setNit(p?.nit ?? '')
      setNombre(p?.nombre ?? '')
      setContacto(p?.contacto ?? '')
      setTelefono(p?.telefono ?? '')
      setEmail(p?.email ?? '')
      setCodigoErp(p?.codigoErp ?? null)
      setFieldErrors({})
      setGlobalError(null)
      setErpVinculado(null)
      setStep('busqueda')
      setResultadosBusqueda([])
      setBusquedaRealizada(false)
      setBuscando(false)
      setTipoBusqueda('nombre')
      setTextoBusqueda('')

      // Cargar empresas
      setCargandoEmpresas(true)
      getEmpresasForUser().then((empresasData) => {
        const sorted = empresasData
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(sorted)
        if (!proveedor && sorted.length > 0) {
          setEmpresaId(prev => prev || sorted[0].value)
        }
      }).finally(() => setCargandoEmpresas(false))
    }
  }, [open]) // SOLO depende de `open`

  const resetForm = (data?: ProveedorRow) => {
    setEmpresaId(data?.empresaId.toString() ?? '')
    setNit(data?.nit ?? '')
    setNombre(data?.nombre ?? '')
    setContacto(data?.contacto ?? '')
    setTelefono(data?.telefono ?? '')
    setEmail(data?.email ?? '')
    const rawCodigo = data?.codigoErp ?? null
    setCodigoErp(rawCodigo && rawCodigo !== 'NULL' ? rawCodigo : null)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
    setErpVinculado(null)
    setStep('busqueda')
    setResultadosBusqueda([])
    setBusquedaRealizada(false)
    setBuscando(false)
    setTipoBusqueda('nombre')
    setTextoBusqueda('')
  }

  // CRÍTICO: inicializar formulario y mode dentro de handleOpenChange
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(proveedor)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  /** Cuando el usuario elige un proveedor del ERP como referencia */
  const handleVincularERP = (erpData: ErpProveedor) => {
    setNit(erpData.nit)
    setNombre(erpData.nombre)
    setContacto(erpData.contacto ?? '')
    setTelefono(erpData.telefono ?? '')
    setEmail(erpData.email ?? '')
    setCodigoErp(erpData.id ?? null)
    setErpVinculado(erpData)
  }

  const handleIrAFormulario = (erpData?: ErpProveedor) => {
    if (erpData) handleVincularERP(erpData)
    setStep('formulario')
  }

  /** Limpia solo los campos del formulario (sin afectar el estado del wizard). */
  const clearFormFields = () => {
    setNit('')
    setNombre('')
    setContacto('')
    setTelefono('')
    setEmail('')
    setCodigoErp(null)
    setErpVinculado(null)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
  }

  /** Paso 1 — Buscar similares */
  const handleBuscar = async () => {
    const errors: Record<string, string> = {}
    if (!empresaId) errors.empresaId = 'Requerido'

    if (tipoBusqueda === 'nombre') {
      if (textoBusqueda.trim().length < MIN_BUSQUEDA_CHARS) {
        errors.busqueda = `Ingrese al menos ${MIN_BUSQUEDA_CHARS} caracteres`
      }
    } else {
      if (!textoBusqueda.trim()) {
        errors.busqueda = 'Ingrese el NIT a buscar'
      }
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // Consumidor Final: saltar búsqueda de duplicados por NIT
    if (tipoBusqueda === 'nit' && isConsumidorFinal(textoBusqueda)) {
      clearFormFields()
      setNit('CF')
      setStep('formulario')
      return
    }

    setBuscando(true)
    const busquedaNorm = tipoBusqueda === 'nombre'
      ? normalizeText(textoBusqueda)
      : textoBusqueda.trim()

    const found = await buscarProveedoresSimilares(busquedaNorm, tipoBusqueda, parseInt(empresaId, 10))
    setBuscando(false)

    clearFormFields()
    if (tipoBusqueda === 'nombre') {
      setNombre(normalizeText(textoBusqueda))
    } else {
      setNit(textoBusqueda.trim())
    }

    if (found.length === 0) {
      setStep('formulario')
      return
    }

    setResultadosBusqueda(found)
    setBusquedaRealizada(true)
  }

  const has100EnCosteos = resultadosBusqueda.some(r => r.pct === 100 && r.source !== 'erp')
  const has100EnERP     = resultadosBusqueda.some(r => r.pct === 100 && r.source === 'erp')
  const bloqueaCrear    = has100EnCosteos || has100EnERP

  // NIT y Nombre son read-only si vinculó ERP o está en modo vista
  const disabledPorERP = (mode === 'view') || (erpVinculado !== null) || (isEditing && !!codigoErp)

  const doSave = async () => {
    setLoading(true)
    try {
      const data: ProveedorInput = {
        empresaId: parseInt(empresaId, 10),
        nit:       normalizeNIT(nit.trim()),
        nombre:    normalizeText(nombre),
        contacto:  contacto.trim() ? normalizeText(contacto) : null,
        telefono:  telefono.trim() || null,
        email:     email.trim().toLowerCase() || null,
        codigoErp: codigoErp ?? null,
      }

      let res
      if (isEditing && proveedor) {
        res = await actualizarProveedor(proveedor.id, { ...data, registroVersion: proveedor.registroVersion })
      } else {
        res = await crearProveedor(data)
      }

      if (!res.ok) {
        if (res.field) {
          setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
        } else {
          setGlobalError(res.error)
        }
      } else {
        if (isEditing) {
          resetForm(res.data)
          setMode('view')
        } else {
          setOpen(false)
        }
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Error inesperado al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!empresaId)       errors.empresaId = 'Requerido'
    if (!nit.trim())      errors.nit       = 'Requerido'
    if (!nombre.trim())   errors.nombre    = 'Requerido'
    if (fieldErrors.nit)  errors.nit       = fieldErrors.nit

    // Validación de dígito verificador
    if (nit.trim() && !errors.nit) {
      const nitResult = validateNIT(nit.trim())
      if (!nitResult.valid) {
        errors.nit = nitResult.error
      }
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // ── Validación de duplicados al guardar ───────────────────────────────────
    const empId      = parseInt(empresaId, 10)
    const nitNorm    = normalizeNIT(nit.trim())
    const nombreNorm = normalizeText(nombre)
    const esCF       = isConsumidorFinal(nit.trim())

    if (!isEditing) {
      setLoading(true)
      const [porNit, porNombre] = await Promise.all([
        esCF ? Promise.resolve([]) : buscarProveedoresSimilares(nitNorm, 'nit', empId),
        buscarProveedoresSimilares(nombreNorm, 'nombre', empId),
      ])
      setLoading(false)

      const soloCosteosFilter = (r: ProveedorSimilarConOrigen) => r.source !== 'erp'

      const nitDuplicado    = erpVinculado
        ? porNit.filter(soloCosteosFilter).some(r => r.pct === 100)
        : porNit.some(r => r.pct === 100)
      const nombreDuplicado = erpVinculado
        ? porNombre.filter(soloCosteosFilter).some(r => r.pct >= 85)
        : porNombre.some(r => r.pct >= 85)

      if (nitDuplicado || nombreDuplicado) {
        const newErrors: Record<string, string> = {}
        if (nitDuplicado)    newErrors.nit    = 'Este NIT ya existe en el sistema'
        if (nombreDuplicado) newErrors.nombre = 'Este nombre ya existe'
        setFieldErrors(newErrors)
        return
      }
    } else if (proveedor) {
      const nitOriginal    = normalizeNIT(proveedor.nit)
      const nombreOriginal = proveedor.nombre
      const nitCambio      = nitNorm !== nitOriginal
      const nombreCambio   = nombreNorm !== nombreOriginal

      if (nitCambio || nombreCambio) {
        setLoading(true)
        const [porNit, porNombre] = await Promise.all([
          (esCF || !nitCambio)
            ? Promise.resolve([])
            : buscarProveedoresSimilares(nitNorm, 'nit', empId, proveedor.id),
          nombreCambio
            ? buscarProveedoresSimilares(nombreNorm, 'nombre', empId, proveedor.id)
            : Promise.resolve([]),
        ])
        setLoading(false)

        const nitDuplicado    = porNit.some(r => r.pct === 100)
        const nombreDuplicado = porNombre.some(r => r.pct >= 85)

        if (nitDuplicado || nombreDuplicado) {
          const newErrors: Record<string, string> = {}
          if (nitDuplicado)    newErrors.nit    = 'Este NIT ya existe en el sistema'
          if (nombreDuplicado) newErrors.nombre = 'Este nombre ya existe'
          setFieldErrors(newErrors)
          return
        }
      }
    }

    await doSave()
  }

  const empresaNombre = empresas.find(e => e.value === empresaId)?.label ?? empresaId

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
        <DialogContent
          className={
            !isEditing && step === 'busqueda'
              ? 'sm:max-w-[520px] flex flex-col p-4 sm:p-6 overflow-hidden'
              : 'sm:max-w-[560px] h-[90vh] sm:h-[580px] flex flex-col p-4 sm:p-6 overflow-hidden'
          }
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className={UI_THEME.modal.title}>
              <Truck className="w-5 h-5 text-indigo-600" />
              {isEditing
                ? mode === 'view' ? 'Detalle Proveedor' : 'Editar Proveedor'
                : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>

          {globalError && (
            <div className={`${UI_THEME.forms.globalError} mb-4`}>
              {globalError}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 1 — BÚSQUEDA (solo para proveedores nuevos)
          ══════════════════════════════════════════════════════ */}
          {!isEditing && step === 'busqueda' && (
            <div className="flex flex-col gap-4 pt-1">

              {/* Empresa */}
              <div className="flex flex-col gap-1.5">
                <Label>Empresa <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  options={empresas}
                  value={empresaId}
                  onChange={v => {
                    setEmpresaId(v)
                    setBusquedaRealizada(false)
                    setResultadosBusqueda([])
                  }}
                  disabled={cargandoEmpresas}
                  placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                />
                <FieldError message={fieldErrors.empresaId} />
              </div>

              {/* Tipo de búsqueda */}
              <div className="flex flex-col gap-1.5">
                <Label>Buscar por</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoBusqueda"
                      value="nombre"
                      checked={tipoBusqueda === 'nombre'}
                      onChange={() => {
                        setTipoBusqueda('nombre')
                        setTextoBusqueda('')
                        setBusquedaRealizada(false)
                        setResultadosBusqueda([])
                      }}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm">Nombre</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoBusqueda"
                      value="nit"
                      checked={tipoBusqueda === 'nit'}
                      onChange={() => {
                        setTipoBusqueda('nit')
                        setTextoBusqueda('')
                        setBusquedaRealizada(false)
                        setResultadosBusqueda([])
                      }}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm">NIT (exacto)</span>
                  </label>
                </div>
              </div>

              {/* Input de búsqueda */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="busq-texto">
                  {tipoBusqueda === 'nombre' ? 'Nombre' : 'NIT'}{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="busq-texto"
                  value={textoBusqueda}
                  onChange={e => {
                    const val = tipoBusqueda === 'nombre'
                      ? e.target.value
                      : e.target.value.replace(/\s/g, '')
                    setTextoBusqueda(val)
                    if (fieldErrors.busqueda) setFieldErrors(prev => { const n = { ...prev }; delete n.busqueda; return n })
                    if (busquedaRealizada) { setBusquedaRealizada(false); setResultadosBusqueda([]) }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBuscar() } }}
                  className={`h-9 ${tipoBusqueda === 'nombre' ? 'uppercase' : ''}`}
                  placeholder={tipoBusqueda === 'nombre' ? 'Ej. DISTRIBUIDORA SIGMA' : 'Ej. 123456-7'}
                  autoFocus
                />
                <FieldError message={fieldErrors.busqueda} />
              </div>

              {/* Resultados */}
              {busquedaRealizada && (
                resultadosBusqueda.length === 0 ? (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                    ✅ No se encontraron registros similares. Puede crear el proveedor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {has100EnCosteos && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                        🚫 Este proveedor ya existe en el sistema. No es posible crear un duplicado.
                      </div>
                    )}
                    {has100EnERP && !has100EnCosteos && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                        🔗 Este proveedor ya existe en el ERP. Usa <strong>Vincular ERP</strong> para importarlo.
                      </div>
                    )}
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-14">Código</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600">Nombre</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-24">NIT</th>
                            <th className="w-28" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resultadosBusqueda.map((r, idx) => (
                            <tr
                              key={idx}
                              className={
                                r.pct === 100 && r.source !== 'erp'
                                  ? 'bg-red-50'
                                  : r.pct === 100 && r.source === 'erp'
                                  ? 'bg-amber-50'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="px-2 py-2 font-mono text-slate-500">
                                {r.source === 'erp'
                                  ? (r.erpData?.codigo ?? r.erpData?.id ?? '—')
                                  : (r.codigoErp ?? '—')}
                              </td>
                              <td className="px-2 py-2 font-medium text-slate-800">{r.nombre}</td>
                              <td className="px-2 py-2 font-mono text-slate-500">{r.nit}</td>
                              <td className="px-2 py-2 text-right">
                                {r.source === 'erp' && r.erpData && !has100EnCosteos && (
                                  <button
                                    type="button"
                                    onClick={() => handleIrAFormulario(r.erpData!)}
                                    className="text-[11px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-medium whitespace-nowrap"
                                  >
                                    Vincular ERP
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* Footer Paso 1 */}
              <div className={UI_THEME.modal.footer}>
                <div />
                <div className={UI_THEME.modal.buttons.rightGroup}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBuscar}
                    disabled={buscando}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {buscando ? 'Buscando...' : 'Buscar'}
                  </Button>
                  {busquedaRealizada && (
                    <Button
                      type="button"
                      onClick={() => handleIrAFormulario()}
                      disabled={bloqueaCrear}
                      title={
                        has100EnCosteos ? 'Este proveedor ya existe en el sistema' :
                        has100EnERP     ? 'Este proveedor ya existe en el ERP — usa Vincular ERP' :
                        undefined
                      }
                    >
                      Crear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 2 — FORMULARIO
          ══════════════════════════════════════════════════════ */}
          {(isEditing || step === 'formulario') && (
            <form onSubmit={handleSave} noValidate className="flex-1 min-h-0 flex flex-col pt-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex-1 flex flex-col min-h-0"
              >
                <TabsList variant="line" className="mb-4 shrink-0">
                  <TabsTrigger value="general">
                    <Truck className="w-4 h-4 mr-2" />
                    General
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                  <TabsContent value="general" className="mt-0">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-4">

                      {/* Empresa */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label>Empresa</Label>
                        {mode === 'view' ? (
                          <Input value={empresaNombre} disabled className="bg-muted/50" />
                        ) : (
                          <SearchableSelect
                            options={empresas}
                            value={empresaId}
                            onChange={setEmpresaId}
                            disabled
                            placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                          />
                        )}
                      </div>

                      {/* NIT */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="nit">
                          NIT <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nit"
                          value={nit}
                          onChange={e => {
                            setNit(e.target.value.replace(/\s/g, ''))
                            if (fieldErrors.nit) setFieldErrors(prev => { const n = { ...prev }; delete n.nit; return n })
                          }}
                          disabled={disabledPorERP}
                          className={`h-8 py-1 ${erpVinculado ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : ''}`}
                          aria-invalid={!!fieldErrors.nit}
                        />
                        <FieldError message={fieldErrors.nit} />
                      </div>

                      {/* Nombre */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label htmlFor="nombre">
                          Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nombre"
                          value={nombre}
                          onChange={e => {
                            setNombre(e.target.value)
                            if (fieldErrors.nombre) setFieldErrors(prev => { const n = { ...prev }; delete n.nombre; return n })
                          }}
                          disabled={disabledPorERP}
                          className={`h-8 py-1 uppercase ${erpVinculado ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : ''}`}
                          aria-invalid={!!fieldErrors.nombre}
                        />
                        <FieldError message={fieldErrors.nombre} />
                      </div>

                      {/* Contacto */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label htmlFor="contacto">Contacto</Label>
                        <Input
                          id="contacto"
                          value={contacto}
                          onChange={e => setContacto(e.target.value)}
                          disabled={mode === 'view'}
                          className="h-8 py-1 uppercase"
                          placeholder="Nombre del contacto"
                        />
                      </div>

                      {/* Teléfono */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                          id="telefono"
                          value={telefono}
                          onChange={e => setTelefono(e.target.value)}
                          disabled={mode === 'view'}
                          className="h-8 py-1"
                          placeholder="Ej. 2222-1111"
                        />
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          disabled={mode === 'view'}
                          className="h-8 py-1"
                          placeholder="contacto@empresa.com"
                        />
                      </div>

                      {/* Código ERP (solo lectura, se puebla desde ERP) */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="codigoErp">Código ERP</Label>
                        <Input
                          id="codigoErp"
                          value={codigoErp && codigoErp !== 'NULL' ? codigoErp : ''}
                          disabled
                          className="h-8 bg-muted/50 font-mono"
                          title="Asignado automáticamente al vincular con el ERP"
                        />
                      </div>

                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* FOOTER FIJO */}
              <div className={UI_THEME.modal.footer}>
                <div>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { clearFormFields(); setStep('busqueda') }}
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
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
                        <History className="mr-2 h-4 w-4" /> Historial
                      </Button>
                      <Button type="button" onClick={() => setMode('edit')}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </Button>
                    </>
                  )}
                  {(mode === 'edit' || !isEditing) && (
                    <>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetForm(proveedor)
                            setMode('view')
                          }}
                          disabled={loading}
                        >
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
          )}
        </DialogContent>
      </Dialog>

      {proveedor && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={proveedor.id}
          entidadTipo="Proveedor"
          tabla="costeos_proveedor"
        />
      )}
    </>
  )
}
