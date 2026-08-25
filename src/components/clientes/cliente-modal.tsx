'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { NumericInput } from '@/components/ui/numeric-input'
import { Building2, Settings2, Save, Pencil, History, Search, ArrowLeft } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearCliente, actualizarCliente, buscarClientesSimilares } from '@/app/actions/clientes'
import type { ClienteSimilarConOrigen } from '@/app/actions/clientes'
import { getEmpresasForUser, getDepartamentosERP, getMunicipiosERP } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import { isConsumidorFinal, normalizeNIT, validateNIT } from '@/lib/utils/nit'
import type { ClienteInput, ClienteRow } from '@/lib/types/clientes'
import type { ErpCliente } from '@/lib/erp'

interface ClienteModalProps {
  cliente?: ClienteRow
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const MIN_BUSQUEDA_CHARS = 3
type ClienteModalStep = 'busqueda' | 'formulario'
type TipoBusqueda = 'nombre' | 'nit'

export function ClienteModal({ cliente, trigger, open: controlledOpen, onOpenChange }: ClienteModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!cliente
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Wizard (solo para nuevos)
  const [step, setStep] = useState<ClienteModalStep>('busqueda')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteSimilarConOrigen[]>([])
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('nombre')
  const [textoBusqueda, setTextoBusqueda] = useState('')

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState<string>('')
  const [nit, setNit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [direccionFiscal, setDireccionFiscal] = useState('')
  const [departamento, setDepartamento] = useState<string>('')   // código como string
  const [municipio, setMunicipio] = useState<string>('')
  const [diasCredito, setDiasCredito] = useState<number | undefined>(0)
  const [codigoErp, setCodigoErp] = useState<string | null>(null)

  // ERP vinculado (campos pre-poblados, read-only)
  const [erpVinculado, setErpVinculado] = useState<ErpCliente | null>(null)

  // Errores y estado
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Empresas
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  // Departamentos y Municipios (ERP)
  const [departamentos, setDepartamentos] = useState<{ value: string; label: string }[]>([])
  const [municipios, setMunicipios] = useState<{ value: string; label: string }[]>([])
  const [loadingDeptos, setLoadingDeptos] = useState(false)
  const [loadingMunis, setLoadingMunis] = useState(false)

  // Cargar empresas y departamentos cuando abre. NO tocar `mode` aquí.
  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      setLoadingDeptos(true)
      Promise.all([
        getEmpresasForUser(),
        getDepartamentosERP(),
      ]).then(([empresasData, deptosData]) => {
        const sorted = empresasData
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(sorted)
        if (!cliente && sorted.length > 0) {
          setEmpresaId(prev => prev || sorted[0].value)
        }

        const sortedDeptos = deptosData
          .map(d => ({ value: String(d.codigo), label: d.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setDepartamentos(sortedDeptos)
      }).finally(() => {
        setCargandoEmpresas(false)
        setLoadingDeptos(false)
      })
    }
  }, [open]) // SOLO depende de `open`

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    let active = true
    if (open && departamento) {
      setLoadingMunis(true)
      getMunicipiosERP(Number(departamento)).then(data => {
        if (active) {
          const sortedMunis = data
            .map(m => ({ value: String(m.codigo), label: m.nombre }))
            .sort((a, b) => a.label.localeCompare(b.label))
          setMunicipios(sortedMunis)
          setLoadingMunis(false)
          // Solo auto-seleccionar si no hay municipio previamente seleccionado
          setMunicipio(prev => {
            if (prev && sortedMunis.some(m => m.value === prev)) return prev
            return sortedMunis.length > 0 ? sortedMunis[0].value : ''
          })
        }
      })
    } else if (!departamento) {
      setMunicipios([])
      setMunicipio('')
    }
    return () => { active = false }
  }, [open, departamento])

  const resetForm = (data?: ClienteRow) => {
    setEmpresaId(data?.empresaId.toString() ?? '')
    setNit(data?.nit ?? '')
    setRazonSocial(data?.razonSocial ?? '')
    setDireccionFiscal(data?.direccionFiscal ?? '')
    setDepartamento(data?.direccionDepartamentoId ? String(data.direccionDepartamentoId) : '')
    setMunicipio(data?.direccionMunicipioId ? String(data.direccionMunicipioId) : '')
    setDiasCredito(data?.diasCredito ?? 0)
    const rawCodigo = data?.codigoErp ?? null
    setCodigoErp(rawCodigo && rawCodigo !== 'NULL' ? rawCodigo : null)
    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
    setErpVinculado(null)
    // Wizard state
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
      resetForm(cliente)
      setMode(isEditing ? 'view' : 'edit')
    }
    setOpen(newOpen)
  }

  /** Cuando el usuario elige un cliente del ERP como referencia */
  const handleVincularERP = (erpData: ErpCliente) => {
    setNit(erpData.nit)
    setRazonSocial(erpData.razonSocial)
    setDireccionFiscal(erpData.direccion ?? '')
    if (erpData.departamentoId != null) {
      setDepartamento(String(erpData.departamentoId))
    }
    if (erpData.municipioId != null) {
      setMunicipio(String(erpData.municipioId))
    }
    setDiasCredito(erpData.diasCredito ?? 0)
    setCodigoErp(erpData.id ?? null)
    setErpVinculado(erpData)
  }

  const handleIrAFormulario = (erpData?: ErpCliente) => {
    if (erpData) handleVincularERP(erpData)
    setStep('formulario')
  }

  /** Limpia solo los campos del formulario (sin afectar el estado del wizard). */
  const clearFormFields = () => {
    setNit('')
    setRazonSocial('')
    setDireccionFiscal('')
    setDepartamento('')
    setMunicipio('')
    setDiasCredito(0)
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

    // ── Consumidor Final: saltar búsqueda de duplicados por NIT ───────────────
    // CF y sus variantes (C/F, C.F., etc.) siempre tienen duplicados legítimos.
    // Avanzamos al formulario directamente con el NIT normalizado a "CF".
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

    const found = await buscarClientesSimilares(busquedaNorm, tipoBusqueda, parseInt(empresaId, 10))
    setBuscando(false)

    // Limpiar campos anteriores y pre-popular solo el campo buscado
    clearFormFields()
    if (tipoBusqueda === 'nombre') {
      setRazonSocial(normalizeText(textoBusqueda))
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
  // Un 100% en cualquier fuente bloquea Crear — el usuario debe Vincular o confirmar que es diferente
  const bloqueaCrear    = has100EnCosteos || has100EnERP

  // NIT y Razón Social son read-only si:
  // - modo vista
  // - se vinculó un cliente del ERP en el wizard de nuevo
  // - se está editando un registro que ya tiene código ERP
  const disabledPorERP = (mode === 'view') || (erpVinculado !== null) || (isEditing && !!codigoErp)

  const doSave = async () => {
    setLoading(true)
    const data: ClienteInput = {
      empresaId:               parseInt(empresaId, 10),
      nit:                     normalizeNIT(nit.trim()),
      razonSocial:             normalizeText(razonSocial),
      direccionFiscal:         normalizeText(direccionFiscal),
      direccionPaisId:         1,  // siempre Guatemala
      direccionDepartamentoId: parseInt(departamento, 10) || 0,
      direccionMunicipioId:    parseInt(municipio, 10)    || 0,
      diasCredito:             diasCredito ?? 0,
      codigoErp:               codigoErp ?? null,
    }

    let res
    if (isEditing && cliente) {
      res = await actualizarCliente(cliente.id, { ...data, registroVersion: cliente.registroVersion })
    } else {
      res = await crearCliente(data)
    }

    setLoading(false)

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
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const errors: Record<string, string> = {}
    if (!empresaId)              errors.empresaId       = 'Requerido'
    if (!nit.trim())             errors.nit             = 'Requerido'
    if (!razonSocial.trim())     errors.razonSocial     = 'Requerido'
    if (!direccionFiscal.trim()) errors.direccionFiscal = 'Requerido'
    if (!departamento)           errors.departamento    = 'Requerido'
    if (!municipio)              errors.municipio       = 'Requerido'
    if (fieldErrors.nit) errors.nit = fieldErrors.nit

    // ── Validación de dígito verificador (Módulo 11 SAT) ──────────────────────
    // Se valida siempre, tanto al crear como al editar, salvo que ya haya un
    // error previo en el campo NIT (ej. NIT duplicado detectado antes).
    if (nit.trim() && !errors.nit) {
      const nitResult = validateNIT(nit.trim())
      if (!nitResult.valid) {
        errors.nit = nitResult.error
      }
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    // ── Validación de duplicados al guardar ────────────────────────────────────
    // Para clientes NUEVOS: valida contra todo Costeos y también el ERP.
    // Para EDICIÓN: valida solo en Costeos (ERP no aplica), excluye el propio
    // registro, y solo corre si NIT o nombre realmente cambiaron.
    const empId      = parseInt(empresaId, 10)
    const nitNorm    = normalizeNIT(nit.trim())
    const nombreNorm = normalizeText(razonSocial)
    const esCF       = isConsumidorFinal(nit.trim())

    if (!isEditing) {
      // ── Crear: buscar duplicados ──────────────────────────────────────────────
      // Si el usuario vinculó un cliente del ERP (erpVinculado != null), el NIT y
      // nombre YA existen en ERP — eso es esperado y fue elegido conscientemente.
      // Solo bloqueamos si ese NIT o nombre ya existe en otro registro de COSTEOS.
      // Si es un cliente completamente nuevo, chequeamos Costeos y ERP.
      setLoading(true)
      const [porNit, porNombre] = await Promise.all([
        esCF ? Promise.resolve([]) : buscarClientesSimilares(nitNorm, 'nit', empId),
        buscarClientesSimilares(nombreNorm, 'nombre', empId),
      ])
      setLoading(false)

      const soloCosteosFilter = (r: ClienteSimilarConOrigen) => r.source !== 'erp'

      // NIT: match exacto (pct=100). Nombre: umbral ≥85%.
      // Al vincular ERP: solo checar Costeos (el ERP match fue elegido por el usuario).
      // Al crear nuevo: checar Costeos y ERP.
      const nitDuplicado    = erpVinculado
        ? porNit.filter(soloCosteosFilter).some(r => r.pct === 100)
        : porNit.some(r => r.pct === 100)
      const nombreDuplicado = erpVinculado
        ? porNombre.filter(soloCosteosFilter).some(r => r.pct >= 85)
        : porNombre.some(r => r.pct >= 85)

      if (nitDuplicado || nombreDuplicado) {
        const newErrors: Record<string, string> = {}
        if (nitDuplicado)    newErrors.nit        = 'Este NIT ya existe en el sistema'
        if (nombreDuplicado) newErrors.razonSocial = 'Este nombre ya existe'
        setFieldErrors(newErrors)
        return
      }
    } else if (cliente) {
      // ── Editar: buscar en Costeos (y ERP para NIT), excluir registro actual ──
      const nitOriginal    = normalizeNIT(cliente.nit)
      const nombreOriginal = cliente.razonSocial
      const nitCambio      = nitNorm !== nitOriginal
      const nombreCambio   = nombreNorm !== nombreOriginal

      if (nitCambio || nombreCambio) {
        setLoading(true)
        const [porNit, porNombre] = await Promise.all([
          (esCF || !nitCambio)
            ? Promise.resolve([])
            : buscarClientesSimilares(nitNorm, 'nit', empId, cliente.id),
          nombreCambio
            ? buscarClientesSimilares(nombreNorm, 'nombre', empId, cliente.id)
            : Promise.resolve([]),
        ])
        setLoading(false)

        // NIT: match exacto (pct=100), incluye ERP — es único en todo el sistema.
        // Nombre: umbral ≥85%, incluye ERP — si el cliente estuviera vinculado (codigoErp)
        // su nombre sería read-only y nunca llegaría aquí. Sin vínculo, los resultados
        // ERP son siempre clientes genuinamente distintos.
        const nitDuplicado    = porNit.some(r => r.pct === 100)
        const nombreDuplicado = porNombre.some(r => r.pct >= 85)

        if (nitDuplicado || nombreDuplicado) {
          const newErrors: Record<string, string> = {}
          if (nitDuplicado)    newErrors.nit        = 'Este NIT ya existe en el sistema'
          if (nombreDuplicado) newErrors.razonSocial = 'Este nombre ya existe'
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
              ? 'sm:max-w-[560px] flex flex-col p-4 sm:p-6 overflow-hidden'
              : 'sm:max-w-[640px] h-[90vh] sm:h-[650px] flex flex-col p-4 sm:p-6 overflow-hidden'
          }
        >
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-slate-500" />
              {isEditing
                ? mode === 'view' ? 'Detalle Cliente' : 'Editar Cliente'
                : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>

          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md mb-4 border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 1 — BÚSQUEDA (solo para clientes nuevos)
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
                    <span className="text-sm">Nombre / Razón Social</span>
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
                  {tipoBusqueda === 'nombre' ? 'Nombre / Razón Social' : 'NIT'}{' '}
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
                  placeholder={tipoBusqueda === 'nombre' ? 'Ej. CONSTRUCTORA SOLIDA' : 'Ej. 123456-7'}
                  autoFocus
                />
                <FieldError message={fieldErrors.busqueda} />
              </div>

              {/* Resultados */}
              {busquedaRealizada && (
                resultadosBusqueda.length === 0 ? (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                    ✅ No se encontraron registros similares. Puede crear el cliente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {has100EnCosteos && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                        🚫 Este cliente ya existe en el sistema. No es posible crear un duplicado.
                      </div>
                    )}
                    {has100EnERP && !has100EnCosteos && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                        🔗 Este cliente ya existe en el ERP. Usa <strong>Vincular ERP</strong> para importarlo — no se puede crear uno nuevo.
                      </div>
                    )}
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-14">Código</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-[28%]">Nombre Comercial</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600">Razón Social</th>
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
                              <td className="px-2 py-2 text-slate-600">
                                {r.source === 'erp' ? (r.erpData?.nombreComercial ?? '—') : '—'}
                              </td>
                              <td className="px-2 py-2 font-medium text-slate-800">{r.razonSocial}</td>
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
              <div className="flex items-center justify-end gap-2 border-t pt-4 mt-1">
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
                      has100EnCosteos ? 'Este cliente ya existe en el sistema' :
                      has100EnERP     ? 'Este cliente ya existe en el ERP — usa Vincular ERP' :
                      undefined
                    }
                  >
                    Crear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 2 — FORMULARIO
          ══════════════════════════════════════════════════════ */}
          {(isEditing || step === 'formulario') && (
            <form onSubmit={handleSave} noValidate className="flex-1 overflow-hidden flex flex-col pt-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex-1 flex flex-col min-h-0"
              >
                <TabsList variant="line" className="mb-4 shrink-0">
                  <TabsTrigger value="general">
                    <Settings2 className="w-4 h-4 mr-2" />
                    General
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                  <TabsContent value="general" className="mt-0">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-4">

                      {/* Empresa — read-only en nuevo, select disabled en edición */}
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 col-span-4">
                          <Label>Empresa</Label>
                          <SearchableSelect
                            options={empresas}
                            value={empresaId}
                            onChange={setEmpresaId}
                            disabled
                            placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 col-span-4">
                          <Label>Empresa</Label>
                          <Input value={empresaNombre} disabled className="h-8 bg-muted/50" />
                        </div>
                      )}

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


                      {/* Razón Social */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label htmlFor="razonSocial">
                          Razón Social <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="razonSocial"
                          value={razonSocial}
                          onChange={e => {
                            setRazonSocial(e.target.value)
                            if (fieldErrors.razonSocial) setFieldErrors(prev => { const n = { ...prev }; delete n.razonSocial; return n })
                          }}
                          disabled={disabledPorERP}
                          className={`h-8 py-1 uppercase ${erpVinculado ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : ''}`}
                          aria-invalid={!!fieldErrors.razonSocial}
                        />
                        <FieldError message={fieldErrors.razonSocial} />
                      </div>

                      {/* ─── Dirección Fiscal ─────────────────────── */}
                      <div className="col-span-4">
                        <div className="flex items-center mb-3">
                          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                            Direccion Fiscal
                          </h3>
                          <div className="flex-1 border-t border-blue-200 mx-3 mt-0.5" />
                        </div>
                        <div className="grid grid-cols-4 gap-x-6 gap-y-4">

                          {/* Dirección (texto libre) */}
                          <div className="flex flex-col gap-1.5 col-span-4">
                            <Label htmlFor="direccionFiscal">
                              Dirección <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="direccionFiscal"
                              value={direccionFiscal}
                              onChange={e => {
                                setDireccionFiscal(e.target.value)
                                if (fieldErrors.direccionFiscal) setFieldErrors(prev => { const n = { ...prev }; delete n.direccionFiscal; return n })
                              }}
                              disabled={mode === 'view' || (erpVinculado !== null && !!erpVinculado?.direccion)}
                              className={`h-8 py-1 uppercase ${erpVinculado?.direccion ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : ''}`}
                              aria-invalid={!!fieldErrors.direccionFiscal}
                              placeholder="Ej. ZONA 10, CIUDAD CAPITAL"
                            />
                            <FieldError message={fieldErrors.direccionFiscal} />
                          </div>

                          {/* País (fijo) */}
                          <div className="flex flex-col gap-1.5 col-span-2">
                            <Label>País</Label>
                            <SearchableSelect
                              options={[{ value: '1', label: 'GUATEMALA' }]}
                              value="1"
                              onChange={() => {}}
                              disabled
                              searchable={false}
                            />
                          </div>

                          {/* Departamento */}
                          <div className="flex flex-col gap-1.5 col-span-2">
                            <Label>
                              Departamento{' '}
                              {loadingDeptos && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                              {' '}<span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                              options={departamentos}
                              value={departamento}
                              onChange={val => {
                                setDepartamento(val)
                                setMunicipio('')
                                if (fieldErrors.departamento) setFieldErrors(prev => { const n = { ...prev }; delete n.departamento; return n })
                              }}
                              disabled={mode === 'view' || loadingDeptos || (erpVinculado !== null && !!erpVinculado?.departamentoId)}
                              placeholder={loadingDeptos ? 'Cargando...' : 'Seleccione...'}
                            />
                            <FieldError message={fieldErrors.departamento} />
                          </div>

                          {/* Municipio */}
                          <div className="flex flex-col gap-1.5 col-span-2">
                            <Label>
                              Municipio{' '}
                              {loadingMunis && <span className="text-xs text-slate-400 font-normal">(cargando...)</span>}
                              {' '}<span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                              options={municipios}
                              value={municipio}
                              onChange={val => {
                                setMunicipio(val)
                                if (fieldErrors.municipio) setFieldErrors(prev => { const n = { ...prev }; delete n.municipio; return n })
                              }}
                              disabled={mode === 'view' || loadingMunis || !departamento || (erpVinculado !== null && !!erpVinculado?.municipioId)}
                              placeholder={loadingMunis ? 'Cargando...' : !departamento ? 'Seleccione departamento' : 'Seleccione...'}
                            />
                            <FieldError message={fieldErrors.municipio} />
                          </div>

                        </div>
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

                      {/* Días Crédito */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="diasCredito">Días Crédito</Label>
                        <NumericInput
                          id="diasCredito"
                          value={diasCredito}
                          isInteger
                          disabled={mode === 'view'}
                          onChange={val => setDiasCredito(val)}
                        />
                      </div>

                      </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* FOOTER FIJO */}
              <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
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
                  {(mode === 'edit' || !isEditing) && (
                    <>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetForm(cliente)
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

      {cliente && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={cliente.id}
          entidadTipo="Cliente"
          tabla="costeos_cliente"
        />
      )}
    </>
  )
}
