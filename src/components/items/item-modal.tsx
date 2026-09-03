'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FieldError } from '@/components/ui/field-error'
import { Package, Settings2, Save, Pencil, History, SlidersHorizontal, Search, ArrowLeft, DollarSign } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearItem, actualizarItem, buscarItemsSimilaresConERP, getItemSyncHabilitado } from '@/app/actions/items'
import type { SimilarItemConOrigen, ErpSimilarData } from '@/lib/utils/similarity'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import type { ItemInput, ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'
import { TIPOS_ITEM, TIPOS_SERVICIO, MANEJO_COSTOS_OPCIONES } from '@/lib/constants/items'
import { ComboTab } from './combo-tab'
import { CostoTab } from './costo-tab'


interface ItemModalProps {
  item?: ItemRow
  categorias: CategoriaRow[]
  todosItems?: ItemRow[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const MIN_BUSQUEDA_CHARS = 3

type ItemModalStep = 'busqueda' | 'formulario'

export function ItemModal({ item, categorias, todosItems = [], trigger, open: controlledOpen, onOpenChange }: ItemModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen
  const [historialOpen, setHistorialOpen] = useState(false)

  const isEditing = !!item
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Wizard de búsqueda (solo para nuevos ítems)
  const [step, setStep] = useState<ItemModalStep>('busqueda')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<SimilarItemConOrigen[]>([])
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [buscando, setBuscando] = useState(false)

  // Campos del formulario
  const [empresa, setEmpresa] = useState<string>('')
  const [descripcion, setDescripcion] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('UND')
  const [tipoItem, setTipoItem] = useState<string>(TIPOS_ITEM[0].value)
  const [tipoServicio, setTipoServicio] = useState<string>('0')
  const [codigoErp, setCodigoErp] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [precioVentaCero, setPrecioVentaCero] = useState(false)
  const [recurrente, setRecurrente] = useState(false)
  const [recurrenteGasto, setRecurrenteGasto] = useState(false)
  const [manejoCostos, setManejoCostos] = useState<string>('99')
  const [tipo, setTipo] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [activo, setActivo] = useState(true)
  const [combos, setCombos] = useState<import('@/lib/types/items').DetalleComboInput[]>([])

  // Errores y estado
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Similares para edición (advertencia al guardar con nombre parecido)
  const [similares, setSimilares] = useState<SimilarItemConOrigen[]>([])
  // Datos del ERP que el usuario seleccionó como referencia (campos quedan en read-only)
  const [erpVinculado, setErpVinculado] = useState<ErpSimilarData | null>(null)
  // Si la empresa seleccionada tiene sync de ITEMS habilitado con el ERP
  const [syncItemsHabilitado, setSyncItemsHabilitado] = useState(false)

  // Empresas dinámicas
  const [empresas, setEmpresas] = useState<{ value: string; label: string }[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)

  // Cargar empresas solo cuando el modal abre. NO tocar `mode` aquí.
  useEffect(() => {
    if (open) {
      setCargandoEmpresas(true)
      getEmpresasForUser()
        .then(data => {
          const sorted = data
            .map(e => ({ value: e.id.toString(), label: e.nombre }))
            .sort((a, b) => a.label.localeCompare(b.label))
          setEmpresas(sorted)
          // Auto-seleccionar primera empresa para ítems nuevos.
          if (!item && sorted.length > 0) {
            setEmpresa(prev => prev || sorted[0].value)
          }
        })
        .finally(() => setCargandoEmpresas(false))
    }
  }, [open]) // SOLO depende de `open`

  // Verificar sync de ITEMS cuando cambia la empresa seleccionada
  useEffect(() => {
    const empId = parseInt(empresa, 10)
    if (!empId || !open) { setSyncItemsHabilitado(false); return }
    getItemSyncHabilitado(empId).then(setSyncItemsHabilitado)
  }, [empresa, open])

  // Deshabilitar tipo servicio si tipoItem != 2
  useEffect(() => {
    if (tipoItem !== '2') {
      setTipoServicio('0')
    }
  }, [tipoItem])

  // Lista de categorías filtrada por empresa y ordenada alfabéticamente.
  // fallback false: si aún no hay empresa seleccionada no se muestra ninguna categoría.
  const opcionesCategoria = categorias
    .filter(c => empresa ? c.empresaId === parseInt(empresa, 10) : false)
    .map(c => ({ value: c.id.toString(), label: c.nombre }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const resetForm = (data?: ItemRow) => {
    setEmpresa(data?.empresaId.toString() ?? '')
    setDescripcion(data?.descripcion ?? '')
    setUnidadMedida(data?.unidadMedida ?? 'UND')
    setTipoItem(data?.tipoItem.toString() ?? TIPOS_ITEM[0].value)
    setTipoServicio(data?.tipoServicio?.toString() ?? '0')
    setCodigoErp(data?.codigoErp ?? '')
    setCategoriaId(
      data?.categoriaId.toString() ??
        (opcionesCategoria.length > 0 ? opcionesCategoria[0].value : '')
    )
    setPrecioVentaCero(data?.precioVentaCero ?? false)
    setRecurrente(data ? Boolean(data.recurrente) : false)
    setRecurrenteGasto(data ? Boolean(data.recurrenteGasto) : false)
    setManejoCostos(data ? String(data.manejoCostos) : '99')
    setTipo(data ? Boolean(data.tipo) : false)
    setPerfil(data ? Boolean(data.perfil) : false)
    setActivo(data?.activo ?? true)
    
    // Mapear combos
    if (data?.combosPrincipal) {
      setCombos(data.combosPrincipal.map(c => ({
        id: c.id,
        productoSecundarioId: c.productoSecundarioId,
        nuevoCantidad: Number(c.nuevoCantidad),
        nuevoIncluido: Boolean(c.nuevoIncluido),
        nuevoRequerido: Boolean(c.nuevoRequerido),
        renovacionCantidad: Number(c.renovacionCantidad),
        renovacionIncluido: Boolean(c.renovacionIncluido),
        renovacionRequerido: Boolean(c.renovacionRequerido)
      })))
    } else {
      setCombos([])
    }

    setGlobalError(null)
    setFieldErrors({})
    setActiveTab('general')
    setSimilares([])
    setErpVinculado(null)
    // Wizard state
    setStep('busqueda')
    setResultadosBusqueda([])
    setBusquedaRealizada(false)
    setBuscando(false)
  }

  // CRÍTICO: inicializar formulario y mode dentro de handleOpenChange, nunca en useEffect
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm(item)
      setMode(isEditing ? 'view' : 'edit')
      // La auto-selección de empresa ocurre en el .then() del useEffect de empresas,
      // no aquí, para evitar la condición de carrera cuando la lista aún no está cargada.
    }
    setOpen(newOpen)
  }

  /**
   * Cuando el usuario elige un registro del ERP como referencia:
   * auto-puebla los campos mapeables y los bloquea (read-only via erpVinculado).
   */
  const handleUsarDelERP = (erpData: ErpSimilarData) => {
    setDescripcion(erpData.descripcion)
    setUnidadMedida(erpData.unidadMedida)
    setTipoItem(erpData.tipoItem.toString())
    setTipoServicio(erpData.tipoBien.toString())
    setRecurrente(Boolean(erpData.recurrente))
    setPrecioVentaCero(Boolean(erpData.precioVentaCero))
    setPerfil(Boolean(erpData.perfil))
    setManejoCostos(String(erpData.manejoCostos))
    setCodigoErp(erpData.codigo)
    setErpVinculado(erpData)
    setSimilares([])
  }

  /**
   * Paso 1 — Buscar similares antes de crear.
   * Valida empresa y longitud mínima, luego consulta Costeos + ERP.
   */
  const handleBuscar = async () => {
    const errors: Record<string, string> = {}
    if (!empresa) errors.empresa = 'Requerido'
    if (descripcion.trim().length < MIN_BUSQUEDA_CHARS) {
      errors.descripcion = `Ingrese al menos ${MIN_BUSQUEDA_CHARS} caracteres`
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setBuscando(true)
    const found = await buscarItemsSimilaresConERP(
      normalizeText(descripcion),
      parseInt(empresa, 10),
    )
    setBuscando(false)

    // Sin coincidencias → ir directo al formulario
    if (found.length === 0) {
      setStep('formulario')
      return
    }

    setResultadosBusqueda(found)
    setBusquedaRealizada(true)
  }

  /**
   * Paso 1 → Paso 2: ir al formulario completo.
   * Si viene un erpData, auto-puebla los campos del ERP.
   */
  const handleIrAFormulario = (erpData?: ErpSimilarData) => {
    if (erpData) handleUsarDelERP(erpData)
    setStep('formulario')
  }

  // Derived: matches al 100%
  const has100EnCosteos = resultadosBusqueda.some(r => r.pct === 100 && r.source !== 'erp')
  const has100EnERP     = resultadosBusqueda.some(r => r.pct === 100 && r.source === 'erp')
  const bloqueaCrear    = has100EnCosteos || has100EnERP

  // Campo bloqueado si: modo vista, ERP vinculado (al crearlo), o si el registro ya existía con un código ERP
  const disabledPorERP = (mode === 'view') || (erpVinculado !== null) || Boolean(item?.codigoErp)
  const disabledDescripcion = disabledPorERP || (!isEditing && step === 'formulario')

  /** Badge que indica que el campo vino del ERP */
  const BadgeERP = () => erpVinculado ? (
    <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-1 py-0.5 font-semibold align-middle">
      ERP
    </span>
  ) : null

  /** Campos que viven en la pestaña "parámetros" — todos los demás están en "general". */
  const PARAM_FIELDS = ['tipoItem', 'tipoServicio', 'precioVentaCero', 'recurrente', 'recurrenteGasto', 'manejoCostos', 'tipo', 'perfil', 'activo']

  /** Navega a la pestaña que contiene el campo con error. */
  const irATabConError = (campo: string) => {
    if (PARAM_FIELDS.includes(campo)) setActiveTab('parametros')
    else setActiveTab('general')
  }

  /** Ejecuta el guardado real (sin verificación de similares) */
  const doSave = async () => {
    setLoading(true)
    const data: ItemInput = {
      empresaId: parseInt(empresa, 10),
      descripcion: normalizeText(descripcion),
      unidadMedida: normalizeText(unidadMedida),
      tipoItem: parseInt(tipoItem, 10),
      tipoServicio: parseInt(tipoServicio, 10),
      codigoErp: codigoErp.trim() ? normalizeText(codigoErp) : null,
      categoriaId: parseInt(categoriaId, 10),
      precioVentaCero,
      recurrente,
      recurrenteGasto,
      manejoCostos: Number(manejoCostos),
      tipo,
      perfil,
      activo,
      combos: combos.length > 0 ? combos : undefined,
    }

    let res
    if (isEditing && item) {
      res = await actualizarItem(item.id, { ...data, registroVersion: item.registroVersion })
    } else {
      res = await crearItem(data)
    }

    setLoading(false)

    if (!res.ok) {
      if (res.field) {
        setFieldErrors(prev => ({ ...prev, [res.field!]: res.error }))
        irATabConError(res.field)
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

  /**
   * Formulario submit — Paso 2 (nuevo) o edición.
   * Para nuevos ítems: la verificación de similares ya se hizo en el Paso 1.
   * Para edición: se verifica similares aquí (el usuario puede estar renombrando).
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    setSimilares([])

    const errors: Record<string, string> = {}
    if (!empresa) errors.empresa = 'Requerido'
    if (!descripcion.trim()) errors.descripcion = 'Requerido'
    if (!unidadMedida.trim()) errors.unidadMedida = 'Requerido'
    if (!categoriaId) errors.categoriaId = 'Requerido'
    if (fieldErrors.codigoErp) errors.codigoErp = fieldErrors.codigoErp

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      irATabConError(Object.keys(errors)[0])
      return
    }

    // Solo para edición: verificar similares si el nombre cambió
    if (isEditing) {
      const descripcionNormalizada = normalizeText(descripcion)
      const descripcionOriginal    = item?.descripcion ?? ''
      if (descripcionNormalizada !== descripcionOriginal) {
        setLoading(true)
        const found = await buscarItemsSimilaresConERP(
          descripcionNormalizada,
          parseInt(empresa, 10),
          item?.id,
        )
        setLoading(false)

        const duplicadoExacto = found.find(s => s.pct === 100 && s.source !== 'erp')
        if (duplicadoExacto) {
          setFieldErrors(prev => ({
            ...prev,
            descripcion: `Ya existe un ítem con este nombre: "${duplicadoExacto.descripcion}"`,
          }))
          irATabConError('descripcion')
          return
        }
        if (found.length > 0) {
          setSimilares(found)
          irATabConError('descripcion')
          return
        }
      }
    }

    await doSave()
  }

  // ─── Nombre de empresa seleccionada (para mostrarla read-only en paso 2 de nuevo ítem) ─
  const empresaNombre = empresas.find(e => e.value === empresa)?.label ?? empresa

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
        <DialogContent
          className={
            !isEditing && step === 'busqueda'
              ? 'sm:max-w-[520px] flex flex-col p-4 sm:p-6 overflow-hidden'
              : 'sm:max-w-[650px] h-[85vh] sm:h-[550px] flex flex-col p-4 sm:p-6 overflow-hidden'
          }
        >
          <DialogHeader className="mb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="w-5 h-5 text-slate-500" />
              {isEditing
                ? mode === 'view' ? 'Detalle Item' : 'Editar Item'
                : 'Nuevo Item'}
            </DialogTitle>
          </DialogHeader>

          {globalError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md mb-4 border border-red-200 shrink-0">
              {globalError}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 1 — BÚSQUEDA (solo para ítems nuevos)
          ══════════════════════════════════════════════════════ */}
          {!isEditing && step === 'busqueda' && (
            <div className="flex flex-col gap-4 pt-1">

              {/* Empresa */}
              <div className="flex flex-col gap-1.5">
                <Label>Empresa <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  options={empresas}
                  value={empresa}
                  onChange={v => {
                    setEmpresa(v)
                    setCategoriaId('')   // resetear categoría al cambiar empresa
                    setBusquedaRealizada(false)
                    setResultadosBusqueda([])
                  }}
                  disabled={cargandoEmpresas}
                  placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                />
                <FieldError message={fieldErrors.empresa} />
              </div>

              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="busq-nombre">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="busq-nombre"
                  value={descripcion}
                  onChange={e => {
                    setDescripcion(e.target.value)
                    if (fieldErrors.descripcion) setFieldErrors(prev => { const n = { ...prev }; delete n.descripcion; return n })
                    if (busquedaRealizada) { setBusquedaRealizada(false); setResultadosBusqueda([]) }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBuscar() } }}
                  className="h-9 uppercase"
                  placeholder="Ej. OFICIAL DE SEGURIDAD"
                  autoFocus
                />
                <FieldError message={fieldErrors.descripcion} />
              </div>

              {/* Resultados */}
              {busquedaRealizada && (
                resultadosBusqueda.length === 0 ? (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                    ✅ No se encontraron registros similares. Puede crear el ítem.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {has100EnCosteos && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                        🚫 Este ítem ya existe en el sistema. No es posible crear un duplicado.
                      </div>
                    )}
                    {has100EnERP && !has100EnCosteos && (
                      <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
                        🔗 Este ítem ya existe en el ERP. Usa “Vincular ERP” para importarlo.
                      </div>
                    )}
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-10">ID</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600">Descripción</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-600 w-24">Cód. ERP</th>
                            <th className="text-center px-2 py-2 font-semibold text-slate-600 w-14">Match</th>
                            <th className="text-center px-2 py-2 font-semibold text-slate-600 w-16">Origen</th>
                            <th className="w-28" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resultadosBusqueda.map((r, idx) => (
                            <tr key={idx} className={r.pct === 100 && r.source !== 'erp' ? 'bg-red-50' : 'hover:bg-slate-50'}>
                              <td className="px-2 py-2 text-slate-500 font-mono">
                                {r.id > 0 ? r.id : '—'}
                              </td>
                              <td className="px-2 py-2 font-medium text-slate-800">{r.descripcion}</td>
                              <td className="px-2 py-2 font-mono text-slate-500">
                                {r.source === 'erp' ? r.erpData?.codigo : (r.codigoErp ?? '—')}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className={`font-bold ${r.pct === 100 ? 'text-red-600' : 'text-amber-600'}`}>
                                  {r.pct}%
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  r.source === 'erp'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {r.source === 'erp' ? 'ERP' : 'Costeos'}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                {r.source === 'erp' && r.erpData && r.pct === 100 && !has100EnCosteos && (
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

              {/* ── Footer Paso 1 ── */}
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
                      has100EnCosteos ? 'No se puede crear un ítem duplicado' :
                      has100EnERP     ? 'El ítem ya existe en el ERP, usa Vincular ERP' :
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
              PASO 2 — FORMULARIO (nuevo en step='formulario' o edición)
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
                  <TabsTrigger value="parametros">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Parametros
                  </TabsTrigger>
                  {isEditing && (
                    <TabsTrigger value="combo">
                      <Package className="w-4 h-4 mr-2" />
                      Combo
                    </TabsTrigger>
                  )}
                  {isEditing && manejoCostos === '2' && (
                    <TabsTrigger value="costo">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Costo
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                  {/* ── PESTAÑA GENERAL ── */}
                  <TabsContent value="general" className="mt-0">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-4">

                      {/* Empresa — editable solo en edición; en nuevo, read-only (se fijó en paso 1) */}
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 col-span-4">
                          <Label htmlFor="empresa">
                            Empresa <span className="text-red-500">*</span>
                          </Label>
                          <SearchableSelect
                            options={empresas}
                            value={empresa}
                            onChange={setEmpresa}
                            disabled={mode === 'view' || cargandoEmpresas || isEditing}
                            placeholder={cargandoEmpresas ? 'Cargando...' : 'Seleccionar empresa'}
                            error={!!fieldErrors.empresa}
                          />
                          <FieldError message={fieldErrors.empresa} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 col-span-4">
                          <Label>Empresa</Label>
                          <Input value={empresaNombre} disabled className="h-8 bg-muted/50" />
                        </div>
                      )}

                      {/* Descripción */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label htmlFor="descripcion">
                          Descripción <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="descripcion"
                          value={descripcion}
                          onChange={e => {
                            setDescripcion(e.target.value)
                            if (fieldErrors.descripcion) setFieldErrors(prev => { const n = { ...prev }; delete n.descripcion; return n })
                            if (similares.length > 0) setSimilares([])
                            if (erpVinculado) setErpVinculado(null)
                          }}
                          disabled={disabledDescripcion}
                          className="h-8 py-1 uppercase"
                          aria-invalid={!!fieldErrors.descripcion}
                        />
                        <FieldError message={fieldErrors.descripcion} />

                        {/* Advertencia de similares (solo en edición) */}
                        {similares.length > 0 && isEditing && mode === 'edit' && (
                          <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                            <p className="text-xs font-semibold text-amber-800">
                              ⚠️ Advertencia — Nombre similar a {similares.length} registro{similares.length > 1 ? 's' : ''} existente{similares.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-amber-700">
                              Verifique que no sea un error de tipeo antes de continuar. Si son registros distintos, puede guardar de todas formas.
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-amber-700 border-b border-amber-200">
                                  <th className="text-left pb-1 font-semibold">Nombre existente</th>
                                  <th className="text-center pb-1 font-semibold w-14">Sim.</th>
                                  <th className="text-center pb-1 font-semibold w-16">Origen</th>
                                  <th className="w-28" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100">
                                {similares.map((s, idx) => (
                                  <tr key={idx}>
                                    <td className="font-mono py-1 pr-2 text-amber-900">{s.descripcion}</td>
                                    <td className="text-center">
                                      <span className={`font-bold ${s.pct === 100 ? 'text-red-600' : 'text-amber-700'}`}>
                                        {s.pct}%
                                      </span>
                                    </td>
                                    <td className="text-center">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        s.source === 'erp'
                                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {s.source === 'erp' ? 'ERP' : 'Costeos'}
                                      </span>
                                    </td>
                                    <td className="text-right pl-2">
                                      {s.source === 'erp' && s.erpData && (
                                        <button
                                          type="button"
                                          onClick={() => handleUsarDelERP(s.erpData!)}
                                          className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 font-medium whitespace-nowrap"
                                        >
                                          Usar este
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex gap-3 pt-1 border-t border-amber-200">
                              <button
                                type="button"
                                onClick={() => { setSimilares([]); doSave() }}
                                className="text-xs bg-amber-700 text-white px-3 py-1 rounded hover:bg-amber-800 font-medium"
                              >
                                Guardar de todas formas
                              </button>
                              <button
                                type="button"
                                onClick={() => setSimilares([])}
                                className="text-xs text-amber-800 underline hover:text-amber-900"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Unidad Medida */}
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="unidadMedida">
                          Unidad Medida <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="unidadMedida"
                          value={unidadMedida}
                          onChange={e => setUnidadMedida(e.target.value)}
                          disabled={disabledPorERP}
                          className="h-8 py-1 uppercase"
                          aria-invalid={!!fieldErrors.unidadMedida}
                        />
                        <FieldError message={fieldErrors.unidadMedida} />
                      </div>

                      {/* Tipo Ítem */}
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="tipoItem">
                          Tipo Ítem
                        </Label>
                        <SearchableSelect
                          options={TIPOS_ITEM}
                          value={tipoItem}
                          onChange={setTipoItem}
                          disabled={disabledPorERP}
                          placeholder="Seleccione..."
                          searchable={false}
                        />
                      </div>

                      {/* Categoría */}
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <Label htmlFor="categoria">
                          Categoría <span className="text-red-500">*</span>
                        </Label>
                        <SearchableSelect
                          options={opcionesCategoria}
                          value={categoriaId}
                          onChange={setCategoriaId}
                          disabled={mode === 'view'}
                          placeholder="Seleccione..."
                          searchable={false}
                          error={!!fieldErrors.categoriaId}
                        />
                        <FieldError message={fieldErrors.categoriaId} />
                      </div>

                      {/* Código ERP */}
                      <div className="flex flex-col gap-1.5 col-span-4">
                        <Label htmlFor="codigoErp">Código ERP</Label>
                        <Input
                          id="codigoErp"
                          value={codigoErp}
                          onChange={e => setCodigoErp(e.target.value)}
                          disabled={disabledPorERP || !syncItemsHabilitado}
                          className={`h-8 py-1 uppercase ${erpVinculado ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : ''}`}
                          title={!syncItemsHabilitado ? 'El Código ERP es asignado automáticamente cuando la empresa tiene sync con ERP habilitado' : undefined}
                        />
                        <FieldError message={fieldErrors.codigoErp} />
                      </div>

                      {/* Activo (solo en edición) */}
                      {isEditing && (
                        <div className="flex items-center gap-2 col-span-4 mt-2">
                          <Checkbox
                            id="activo"
                            checked={activo}
                            onCheckedChange={checked => setActivo(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="activo" className="font-normal cursor-pointer">
                            Activo
                          </Label>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── PESTAÑA PARÁMETROS ── */}
                  <TabsContent value="parametros" className="mt-0">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {/* Tipo Servicio y Manejo Costos */}
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="tipoServicio">
                          Tipo Servicio
                        </Label>
                        <SearchableSelect
                          options={TIPOS_SERVICIO}
                          value={tipoServicio}
                          onChange={setTipoServicio}
                          disabled={mode === 'view' || tipoItem !== '2' || erpVinculado !== null}
                          placeholder="Seleccione..."
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="manejoCostos">
                          Manejo Costos
                        </Label>
                        <SearchableSelect
                          options={MANEJO_COSTOS_OPCIONES}
                          value={manejoCostos}
                          onChange={setManejoCostos}
                          disabled={mode === 'view' || erpVinculado !== null}
                          searchable={false}
                        />
                      </div>

                      {/* Checkboxes */}
                      <div className="col-span-2 flex flex-col gap-3 mt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="precioVentaCero"
                            checked={precioVentaCero}
                            onCheckedChange={checked => setPrecioVentaCero(checked as boolean)}
                            disabled={mode === 'view' || erpVinculado !== null}
                          />
                          <Label htmlFor="precioVentaCero" className="font-normal cursor-pointer">
                            Permitir Precio Cero
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="recurrente"
                            checked={recurrente}
                            onCheckedChange={checked => setRecurrente(checked as boolean)}
                            disabled={mode === 'view' || erpVinculado !== null}
                          />
                          <Label htmlFor="recurrente" className="font-normal cursor-pointer">
                            Recurrente
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="recurrenteGasto"
                            checked={recurrenteGasto}
                            onCheckedChange={checked => setRecurrenteGasto(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="recurrenteGasto" className="font-normal cursor-pointer">Recurrente Gasto</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="tipo"
                            checked={tipo}
                            onCheckedChange={checked => setTipo(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="tipo" className="font-normal cursor-pointer">Tipo</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="perfil"
                            checked={perfil}
                            onCheckedChange={checked => setPerfil(checked as boolean)}
                            disabled={mode === 'view' || erpVinculado !== null}
                          />
                          <Label htmlFor="perfil" className="font-normal cursor-pointer">
                            Perfil
                          </Label>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── PESTAÑA COMBO ── */}
                  <TabsContent value="combo" className="mt-0 h-full">
                    <ComboTab
                      combos={combos}
                      setCombos={setCombos}
                      todosItems={todosItems.filter(i => i.empresaId === parseInt(empresa, 10))}
                      itemId={item?.id}
                      isEditing={isEditing}
                      mode={mode}
                    />
                  </TabsContent>

                  {/* ── PESTAÑA COSTO (solo cuando Manejo Costos = Manual) ── */}
                  {isEditing && manejoCostos === '2' && item && (
                    <TabsContent value="costo" className="mt-0 h-full">
                      <CostoTab
                        itemId={item.id}
                        mode={mode}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              {/* ── FOOTER FIJO ── */}
              <div className="flex flex-row items-center justify-between mt-6 -mx-4 -mb-4 px-4 py-4 border-t bg-slate-50 sm:rounded-b-xl shrink-0">
                {/* Botón Atrás (solo para nuevo ítem en paso 2) */}
                <div>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep('busqueda')}
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
                            resetForm(item)
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

      {item && (
        <HistorialDrawer
          open={historialOpen}
          onOpenChange={setHistorialOpen}
          entidadId={item.id}
          entidadTipo="Item"
          tabla="costeos_item"
        />
      )}
    </>
  )
}
