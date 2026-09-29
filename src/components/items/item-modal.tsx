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
import { Package, Settings2, Save, Pencil, History, SlidersHorizontal, Search, ArrowLeft, DollarSign, Layers, Link2 } from 'lucide-react'
import { HistorialDrawer } from '@/components/shared/historial-drawer'
import { crearItem, actualizarItem, buscarItemsSimilaresConERP, buscarItemsLIKEConERP, getItemSyncHabilitado, contarCostosRefItem } from '@/app/actions/items'
import { listarTiposCombosPorEmpresa } from '@/app/actions/tipos-combo'
import type { SimilarItemConOrigen, ErpSimilarData } from '@/lib/utils/similarity'
import { getEmpresasForUser } from '@/app/actions/erp'
import { normalizeText } from '@/lib/utils/text'
import type { ItemInput, ItemRow } from '@/lib/types/items'
import type { CategoriaRow } from '@/lib/types/categorias'
import { TIPOS_ITEM, TIPOS_PRODUCTO_SERVICIO, MANEJO_COSTOS_OPCIONES, getTipoProductoFijo, labelTipoProducto } from '@/lib/constants/items'
import { NumericInput } from '@/components/ui/numeric-input'
import { ComboTab } from './combo-tab'
import { CostoTab } from './costo-tab'
import { CostoReferenciaTab } from './costo-referencia-tab'
import { TiposComboTab, type ItemTipoComboAsoc } from './tipos-combo-tab'
import { UI_THEME } from '@/lib/theme'


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

  // currentItem: copia local que se actualiza tras cada guardado exitoso.
  // Esto evita que revalidatePath (que re-renderiza la pagina) cierre el modal
  // al resetear el prop `item` al valor anterior antes de que React rehidrate.
  const [currentItem, setCurrentItem] = useState<typeof item>(item)

  const isEditing = !!currentItem
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
  const [tipoProducto, setTipoProducto] = useState<string>('0')
  const [codigoErp, setCodigoErp] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [tipoComboId, setTipoComboId] = useState<string>('')          // '' = sin asignar (campo opcional)
  const [precioVentaCero, setPrecioVentaCero] = useState(false)
  const [venta, setVenta] = useState(false)
  const [recurrente, setRecurrente] = useState(false)
  const [recurrenteGasto, setRecurrenteGasto] = useState(false)
  const [manejoCostos, setManejoCostos] = useState<string>('99')
  const [cotizacionScope, setCotizacionScope] = useState<string>('GENERAL')
  const [porCosteo, setPorCosteo] = useState<boolean>(false)
  const [costoReferenciaItemId, setCostoReferenciaItemId] = useState<string>('')
  // Contador de registros en costeo_item_costo_ref — controla la inmutabilidad del ítem de referencia
  const [contadorCostosRef, setContadorCostosRef] = useState<number>(0)
  const [tipo, setTipo] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [uniforme, setUniforme] = useState(false)
  const [activo, setActivo] = useState(true)
  const [combos, setCombos] = useState<import('@/lib/types/items').DetalleComboInput[]>([])
  const [tiposComboAsocs, setTiposComboAsocs] = useState<ItemTipoComboAsoc[]>([])


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
  // TiposCombos disponibles para el select de Parámetros
  const [opcionesTipoCombo, setOpcionesTipoCombo] = useState<{ value: string; label: string }[]>([])

  // Cargar empresas y tipos combo cuando el modal abre. NO tocar `mode` aquí.
  useEffect(() => {
    if (!open) return

    // ── RESET DEFENSIVO (R22) — solo campos, NUNCA mode ──────────────────────
    const tc = item ?? null
    setDescripcion(tc?.descripcion ?? '')
    setUnidadMedida(tc?.unidadMedida ?? 'UND')
    setCategoriaId(tc?.categoriaId?.toString() ?? '')
    setTipoComboId(tc?.tipoComboId ? tc.tipoComboId.toString() : '')
    setCostoReferenciaItemId(tc?.costoReferenciaItemId ? tc.costoReferenciaItemId.toString() : '')
    setContadorCostosRef(0)
    setFieldErrors({})
    setGlobalError(null)
    setSimilares([])
    setCotizacionScope(tc?.cotizacionScope ?? 'GENERAL')
    setPorCosteo(tc ? Boolean(tc.porCosteo) : false)
    setTiposComboAsocs(tc?.tiposCombo?.map(t => ({ tipoComboId: t.tipoComboId, obligatorio: t.obligatorio })) ?? [])

    // ── Cargar empresas ───────────────────────────────────────────────────────
    let active = true
    setCargandoEmpresas(true)
    getEmpresasForUser()
      .then(data => {
        if (!active) return
        const sorted = data
          .map(e => ({ value: e.id.toString(), label: e.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setEmpresas(sorted)
        // Auto-seleccionar primera empresa para ítems nuevos.
        if (!item && sorted.length > 0) {
          setEmpresa(prev => prev || sorted[0].value)
        }
      })
      .finally(() => { if (active) setCargandoEmpresas(false) })

    // ── Cargar contador de pcts de referencia (para inmutabilidad) ────────────
    if (tc?.id && tc.manejoCostos === 3) {
      contarCostosRefItem(tc.id).then(count => {
        if (active) setContadorCostosRef(count)
      })
    }

    return () => { active = false }
  }, [open]) // SOLO depende de `open`


  // Cargar tipos combo disponibles cuando cambia la empresa
  useEffect(() => {
    const empId = parseInt(empresa, 10)
    if (!empId || !open) { setOpcionesTipoCombo([]); return }
    listarTiposCombosPorEmpresa(empId).then(tipos => {
      setOpcionesTipoCombo(tipos.map(t => ({ value: t.id.toString(), label: t.nombre })).sort((a, b) => a.label.localeCompare(b.label)))
    })
  }, [empresa, open])

  // Verificar sync de ITEMS cuando cambia la empresa seleccionada
  useEffect(() => {
    const empId = parseInt(empresa, 10)
    if (!empId || !open) { setSyncItemsHabilitado(false); return }
    getItemSyncHabilitado(empId).then(setSyncItemsHabilitado)
  }, [empresa, open])

  // Auto-forzar tipoProducto cuando el tipo_item lo tiene fijo
  useEffect(() => {
    const fijo = getTipoProductoFijo(tipoItem)
    if (fijo !== null) setTipoProducto(String(fijo))
  }, [tipoItem])

  // Items Genéricos (tipoItem=2): Manejo Costos siempre = Solicitar Usuario (4)
  useEffect(() => {
    if (Number(tipoItem) === 2) {
      setManejoCostos('4')
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
    setTipoProducto(data?.tipoProducto?.toString() ?? '0')
    setCodigoErp(data?.codigoErp ?? '')
    setCategoriaId(
      data?.categoriaId.toString() ??
        (opcionesCategoria.length > 0 ? opcionesCategoria[0].value : '')
    )
    setTipoComboId(data?.tipoComboId ? data.tipoComboId.toString() : '')
    setPrecioVentaCero(data?.precioVentaCero ?? false)
    setVenta(data?.venta === 1)
    setRecurrente(data ? Boolean(data.recurrente) : false)
    setRecurrenteGasto(data ? Boolean(data.recurrenteGasto) : false)
    setManejoCostos(data ? String(data.manejoCostos) : '99')
    setCotizacionScope(data?.cotizacionScope ?? 'GENERAL')
    setPorCosteo(data ? Boolean(data.porCosteo) : false)
    setTipo(data ? Boolean(data.tipo) : false)
    setPerfil(data ? Boolean(data.perfil) : false)
    setUniforme(data ? Boolean(data.uniforme) : false)
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

    // Mapear tiposCombo
    if (data?.tiposCombo) {
      setTiposComboAsocs(data.tiposCombo.map(t => ({
        tipoComboId: t.tipoComboId,
        obligatorio: t.obligatorio,
      })))
    } else {
      setTiposComboAsocs([])
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
      setCurrentItem(item)           // sincroniza con el prop al abrir
      resetForm(item)
      setMode(item ? 'view' : 'edit')
      // La auto-seleccion de empresa ocurre en el .then() del useEffect de empresas,
      // no aqui, para evitar la condicion de carrera cuando la lista aun no esta cargada.
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
    setTipoProducto(erpData.tipoProducto?.toString() ?? '0')
    setRecurrente(Boolean(erpData.recurrente))
    setPrecioVentaCero(Boolean(erpData.precioVentaCero))
    setPerfil(Boolean(erpData.perfil))
    setManejoCostos(String(erpData.manejoCostos))
    setUniforme(Boolean(erpData.uniforme))
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
    const found = await buscarItemsLIKEConERP(
      normalizeText(descripcion),
      parseInt(empresa, 10),
    )
    setBuscando(false)

    setResultadosBusqueda(found)
    setBusquedaRealizada(true)
  }

  /**
   * Paso 1 → Paso 2: ir al formulario completo.
   * Si viene un erpData, auto-puebla los campos del ERP.
   */
  const handleIrAFormulario = (erpData?: ErpSimilarData) => {
    // Guardar los valores del Paso 1 antes del reset
    const empresaActual     = empresa
    const descripcionActual = descripcion

    // Limpiar TODO el formulario a defaults
    resetForm(undefined)

    // Restaurar empresa y descripcion del Paso 1
    // (handleUsarDelERP sobreescribirá descripcion con el nombre del ERP si aplica)
    setEmpresa(empresaActual)
    setDescripcion(descripcionActual)

    setSimilares([])
    setGlobalError(null)
    setFieldErrors({})

    if (erpData) handleUsarDelERP(erpData)
    setStep('formulario')
  }

  // Derived: hay exacto en Costeos (solo para badge informativo, no bloquea)
  const has100EnCosteos = resultadosBusqueda.some(r => r.pct === 100 && r.source !== 'erp')

  // Campo bloqueado si: modo vista, ERP vinculado (al crearlo), o si el registro ya existía con un código ERP
  const disabledPorERP = (mode === 'view') || (erpVinculado !== null) || Boolean(item?.codigoErp)
  const disabledDescripcion = disabledPorERP

  /** Badge que indica que el campo vino del ERP */
  const BadgeERP = () => erpVinculado ? (
    <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-1 py-0.5 font-semibold align-middle">
      ERP
    </span>
  ) : null

  /** Campos que viven en la pestaña "parámetros" — todos los demás están en "general". */
  const PARAM_FIELDS = ['tipoItem', 'tipoProducto', 'venta', 'precioVentaCero', 'recurrente', 'recurrenteGasto', 'manejoCostos', 'costoReferenciaItemId', 'tipo', 'perfil', 'uniforme', 'activo']

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
      tipoProducto: parseInt(tipoProducto, 10),
      codigoErp: codigoErp.trim() ? normalizeText(codigoErp) : null,
      categoriaId: parseInt(categoriaId, 10),
      tipoComboId: tipoComboId ? parseInt(tipoComboId, 10) : null,
      precioVentaCero,
      venta,
      recurrente,
      recurrenteGasto,
      manejoCostos: Number(manejoCostos),
      cotizacionScope: manejoCostos === '1' ? cotizacionScope : 'GENERAL',
      porCosteo: manejoCostos === '1' ? (porCosteo ? 1 : 0) : 0,
      costoReferenciaItemId: manejoCostos === '3' && costoReferenciaItemId
        ? parseInt(costoReferenciaItemId, 10)
        : null,
      tipo,
      perfil,
      uniforme,
      activo,
      combos: combos.length > 0 ? combos : undefined,
      tiposComboIds: tiposComboAsocs.length > 0 ? tiposComboAsocs : undefined,
    }

    let res
    if (isEditing && currentItem) {
      res = await actualizarItem(currentItem.id, { ...data, registroVersion: currentItem.registroVersion })
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
        setCurrentItem(res.data)   // actualiza la copia local con los datos del servidor
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
    if (Number(manejoCostos) === 0) errors.manejoCostos = 'Selecciona cómo se manejarán los costos'
    if (manejoCostos === '3' && !costoReferenciaItemId) errors.costoReferenciaItemId = 'Selecciona el ítem de referencia'
    if (fieldErrors.codigoErp) errors.codigoErp = fieldErrors.codigoErp

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      irATabConError(Object.keys(errors)[0])
      return
    }


    // Para nuevos ítems: verificar similares al guardar (la restricción real)
    // Se omite si el usuario ya seleccionó explícitamente un ítem del ERP (erpVinculado !== null)
    if (!isEditing && erpVinculado === null) {
      const descripcionNormalizada = normalizeText(descripcion)
      setLoading(true)
      const found = await buscarItemsSimilaresConERP(
        descripcionNormalizada,
        parseInt(empresa, 10),
      )
      setLoading(false)

      const duplicadoExacto = found.find(s => s.pct === 100 && s.source !== 'erp')
      if (duplicadoExacto) {
        setGlobalError(`Ya existe un ítem idéntico: "${duplicadoExacto.descripcion}". No se puede crear un duplicado.`)
        return
      }
      if (found.length > 0) {
        setSimilares(found)
        setActiveTab('general')
        return
      }
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
            <div className={`${UI_THEME.forms.globalError} shrink-0`}>
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
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        ⚠️ Se encontró al menos un ítem idéntico en Costeos. Puedes igualmente crear uno nuevo — el sistema lo validará al guardar.
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
                              <td className="px-2 py-2 font-medium text-slate-800">
                                {r.descripcion}
                                {r.pct === 100 && r.source !== 'erp' && (
                                  <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 border border-red-200 rounded px-1 py-0.5 font-semibold align-middle">
                                    YA EXISTE
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 font-mono text-slate-500">
                                {r.source === 'erp' ? r.erpData?.codigo : (r.codigoErp ?? '—')}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className={`font-bold ${r.pct === 100 ? 'text-red-600' : r.pct >= 85 ? 'text-amber-600' : 'text-slate-400'}`}>
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
                                {r.source === 'erp' && r.erpData && (
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
                  >
                    Crear Nuevo
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PASO 2 — FORMULARIO (nuevo en step='formulario' o edición)
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
                  <TabsTrigger value="tipos-combo">
                    <Layers className="w-4 h-4 mr-2" />
                    Tipos Combo
                  </TabsTrigger>
                  {isEditing && manejoCostos === '2' && (
                    <TabsTrigger value="costo">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Costo
                    </TabsTrigger>
                  )}
                  {isEditing && manejoCostos === '3' && (
                    <TabsTrigger value="costo-ref">
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

                        {/* Advertencia de similares (edición o nuevo ítem en paso 2) */}
                        {similares.length > 0 && (mode === 'edit' || !isEditing) && (
                          <div className={UI_THEME.forms.warningSimilar}>
                            <p className={UI_THEME.forms.warningSimilarTitle}>
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
                      {/* Tipo Producto — siempre visible, editable solo para tipoItem=3 (Servicio) */}
                      {(() => {
                        const tiNum = Number(tipoItem)
                        const esEditable = tiNum === 3
                        // Opciones contextuales según tipo_item
                        const opciones = esEditable
                          ? TIPOS_PRODUCTO_SERVICIO  // Estándar | Outsourcing
                          : [{
                              value: tipoProducto,
                              label: labelTipoProducto(tipoProducto, tiNum),
                            }]
                        return (
                          <div className="flex flex-col gap-1.5 col-span-1">
                            <Label htmlFor="tipoProducto">Tipo Producto</Label>
                            <SearchableSelect
                              options={opciones}
                              value={tipoProducto}
                              onChange={setTipoProducto}
                              disabled={mode === 'view' || !esEditable}
                              placeholder="—"
                              searchable={false}
                            />
                          </div>
                        )
                      })()}


                      {/* Aviso de destrucción de costos manuales */}
                      {isEditing && item?.manejoCostos === 2 && Number(manejoCostos) !== 2 && (
                        <div className="col-span-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                          ⚠️ Al guardar, se eliminarán todos los costos manuales registrados para este ítem. Esta acción no se puede deshacer.
                        </div>
                      )}

                      {/* Aviso de destrucción de costos de referencia */}
                      {isEditing && item?.manejoCostos === 3 && Number(manejoCostos) !== 3 && (
                        <div className="col-span-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                          ⚠️ Al guardar, se eliminarán todos los porcentajes de costo referencia registrados para este ítem. Esta acción no se puede deshacer.
                        </div>
                      )}


                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="manejoCostos">
                          Manejo Costos
                          {Number(tipoItem) === 2 && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5 font-semibold align-middle">
                              Forzado
                            </span>
                          )}
                        </Label>
                        <SearchableSelect
                          options={MANEJO_COSTOS_OPCIONES}
                          value={manejoCostos}
                          onChange={setManejoCostos}
                          disabled={mode === 'view' || Number(tipoItem) === 2}
                          searchable={false}
                        />
                        <FieldError message={fieldErrors.manejoCostos} />
                        {Number(tipoItem) === 2 && (
                          <p className="text-xs text-amber-700 mt-0.5">
                            Los ítems Genéricos siempre usan "Solicitar Usuario".
                          </p>
                        )}
                        {/* Por Costeo — siempre visible, solo editable cuando manejoCostos = Compras */}
                        <div className="flex items-center gap-2 mt-1">
                          <Checkbox
                            id="porCosteo"
                            checked={manejoCostos === '1' && porCosteo}
                            onCheckedChange={checked => setPorCosteo(checked as boolean)}
                            disabled={mode === 'view' || manejoCostos !== '1'}
                          />
                          <Label
                            htmlFor="porCosteo"
                            className={`font-normal ${manejoCostos === '1' && mode !== 'view' ? 'cursor-pointer' : 'cursor-default text-muted-foreground'}`}
                          >
                            Por Costeo
                          </Label>
                        </div>
                      </div>

                      {/* ─── Scope Cotización — solo visible cuando manejoCostos = Compras (1) ─── */}
                      {manejoCostos === '1' && (
                        <div className="col-span-1 flex flex-col gap-1.5">
                          <Label className={UI_THEME.forms.labelBase}>Scope Cotización</Label>
                          <SearchableSelect
                            options={[
                              { value: 'GENERAL',      label: 'General' },
                              { value: 'POR_PROYECTO', label: 'Por Proyecto' },
                            ]}
                            value={cotizacionScope}
                            onChange={setCotizacionScope}
                            disabled={mode === 'view'}
                            searchable={false}
                          />
                        </div>
                      )}

                      {/* ─── Panel Ítem de Referencia — solo visible cuando manejoCostos = Referencia ─── */}
                      {manejoCostos === '3' && (
                        <div className="col-span-2 rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                            <Link2 className="h-3.5 w-3.5" />
                            Ítem de Referencia
                          </p>
                          {contadorCostosRef > 0 ? (
                            /* Ítem de referencia inmutable — ya tiene porcentajes registrados */
                            <>
                              <Input
                                value={
                                  todosItems.find(i => i.id === parseInt(costoReferenciaItemId, 10))?.descripcion
                                  ?? currentItem?.costoReferenciaDescripcion
                                  ?? costoReferenciaItemId
                                  ?? '—'
                                }
                                disabled
                                className="bg-white/60 text-blue-900 font-medium"
                              />
                              <p className="text-xs text-blue-500 flex items-center gap-1">
                                🔒 El ítem de referencia no puede modificarse porque ya existen porcentajes registrados.
                              </p>
                            </>
                          ) : (
                            /* Ítem de referencia editable — aún no hay porcentajes */
                            <>
                              <SearchableSelect
                                options={todosItems
                                  .filter(i =>
                                    i.empresaId === parseInt(empresa, 10) &&
                                    i.id !== currentItem?.id  // excluir el ítem actual
                                  )
                                  .map(i => ({ value: i.id.toString(), label: i.descripcion }))
                                  .sort((a, b) => a.label.localeCompare(b.label))
                                }
                                value={costoReferenciaItemId}
                                onChange={setCostoReferenciaItemId}
                                disabled={mode === 'view'}
                                placeholder="Buscar ítem de referencia..."
                              />
                              <FieldError message={fieldErrors.costoReferenciaItemId} />
                              <p className="text-xs text-blue-500">
                                Una vez que registres el primer porcentaje, este campo se bloqueará.
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Tipo Combo — opcional, no viene del ERP */}
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <Label htmlFor="tipoComboId">Tipo Combo</Label>
                        <SearchableSelect
                          options={[{ value: '', label: '— Sin asignar —' }, ...opcionesTipoCombo]}
                          value={tipoComboId}
                          onChange={setTipoComboId}
                          disabled={mode === 'view'}
                          placeholder="Sin asignar"
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
                            id="venta"
                            checked={venta}
                            onCheckedChange={checked => setVenta(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="venta" className="font-normal cursor-pointer">
                            Venta
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
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="uniforme"
                            checked={uniforme}
                            onCheckedChange={checked => setUniforme(checked as boolean)}
                            disabled={mode === 'view'}
                          />
                          <Label htmlFor="uniforme" className="font-normal cursor-pointer">
                            Uniforme
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

                  {/* ── PESTAÑA TIPOS COMBO ── */}
                  <TabsContent value="tipos-combo" className="mt-0 h-full">
                    <TiposComboTab
                      empresaId={parseInt(empresa, 10) || 0}
                      value={tiposComboAsocs}
                      onChange={setTiposComboAsocs}
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

                  {/* ── PESTAÑA COSTO REF. (solo cuando Manejo Costos = Referencia) ── */}
                  {isEditing && manejoCostos === '3' && item && (
                    <TabsContent value="costo-ref" className="mt-0 h-full">
                      <CostoReferenciaTab
                        itemId={item.id}
                        mode={mode}
                        referenciaDescripcion={item.costoReferenciaDescripcion}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              {/* ── FOOTER FIJO ── */}
              {/* Nota: sm:-mx-6 sm:-mb-6 sm:px-6 extienden UI_THEME.modal.footer
                  porque este DialogContent usa sm:p-6 (padding mayor al estándar sm:p-4) */}
              <div className={`${UI_THEME.modal.footer} sm:-mx-6 sm:-mb-6 sm:px-6`}>
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
