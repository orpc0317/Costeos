"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { ComboDisponible, RecursoCosteo } from '@/lib/types/costeos';
import { NumericInput } from '@/components/ui/numeric-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Minus, Plus, PlusCircle, Pencil, Trash2, AlertTriangle,
  ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown, Loader2,
} from 'lucide-react';
import { getCostosUltimosManual, buscarItemsParaCombo, autoCrearItemDesdeERP, getItemSyncHabilitado, type ComboItemOpcion } from '@/app/actions/items';
import type { ItemRow } from '@/lib/types/items';
import { resolveCategoria } from '@/lib/utils/combos';


// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ComboTabProps {
  recurso: RecursoCosteo;
  parentId: string | null;
  esBorrador: boolean;
  hermanos: RecursoCosteo[];
  catalogoItems: ItemRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esPendiente(hermano: RecursoCosteo): boolean {
  if (hermano.categoria === 'RECURSO_HUMANO' && !hermano.turnoCodigo) return true;
  return false;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ComboTab({
  recurso, parentId, esBorrador, hermanos, catalogoItems,
}: ComboTabProps) {
  const { dispatch, proyecto } = useCosteo();
  const empresaId = proyecto?.empresaId ?? 0;

  const [localCosts, setLocalCosts] = useState<Record<number, number>>({});
  const [selectedSubItemId, setSelectedSubItemId] = useState<string>('');
  const [selectedOpcion, setSelectedOpcion] = useState<ComboItemOpcion | null>(null);
  const [subItemCosto, setSubItemCosto] = useState<number>(0);
  const [subItemSolicitaCosto, setSubItemSolicitaCosto] = useState<boolean>(false);
  const [isLoadingSubCosto, setIsLoadingSubCosto] = useState(false);
  const [isAutoCreando, setIsAutoCreando] = useState(false);
  const [autoCrearError, setAutoCrearError] = useState<string | null>(null);
  const [showAgregar, setShowAgregar] = useState(false);
  const [subItemSubmitTried, setSubItemSubmitTried] = useState(false);

  // ── Búsqueda unificada Costeos + ERP ──────────────────────────────────────
  const [syncHabilitado, setSyncHabilitado] = useState(false);
  const [opcionesCombo, setOpcionesCombo] = useState<ComboItemOpcion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial: opciones de Costeos (sin texto) y verifica sync ERP
  useEffect(() => {
    if (!empresaId) return;
    buscarItemsParaCombo('', empresaId, [recurso.itemId]).then(setOpcionesCombo);
    getItemSyncHabilitado(empresaId).then(setSyncHabilitado);
  }, [empresaId, recurso.itemId]);

  /** Maneja el input de búsqueda del SearchableSelect con debounce de 350ms */
  const handleSearchChange = useCallback((texto: string) => {
    if (!syncHabilitado || !empresaId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const opts = await buscarItemsParaCombo(texto, empresaId, [recurso.itemId]);
        setOpcionesCombo(opts);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, [syncHabilitado, empresaId, recurso.itemId]);

  // ── Expand / Collapse ─────────────────────────────────────────────────────
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  // IDs de filas manuales colapsadas (usa RecursoCosteo.id — string de runtime)
  const [collapsedManualIds, setCollapsedManualIds] = useState<Set<string>>(new Set());

  const combosDisponibles = recurso.combosDisponibles ?? [];

  const rootEffectiveQty =
    recurso.categoria === 'RECURSO_HUMANO'
      ? (recurso.cantidad || 1) * (recurso.personas || 1)
      : (recurso.cantidad || 1);

  // ── Expand / Collapse helpers ─────────────────────────────────────────────

  const getAllComboIds = useCallback((combos: ComboDisponible[]): number[] => {
    const ids: number[] = [];
    const collect = (c: ComboDisponible) => {
      if ((c.hijos?.length ?? 0) > 0) ids.push(c.productoSecundarioId);
      c.hijos?.forEach(collect);
    };
    combos.forEach(collect);
    return ids;
  }, []);

  const toggleCollapse = (id: number) =>
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleManualCollapse = (id: string) =>
    setCollapsedManualIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(getAllComboIds(combosDisponibles)));

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getOriginalItemIds = (combos: ComboDisponible[]): Set<number> => {
    const ids = new Set<number>();
    const collect = (c: ComboDisponible) => {
      ids.add(c.productoSecundarioId);
      c.hijos?.forEach(collect);
    };
    combos.forEach(collect);
    return ids;
  };

  const originalItemIds = getOriginalItemIds(combosDisponibles);

  const manualHermanos = hermanos.filter(
    h => h.esCombo && h.comboParentId === recurso.id && !originalItemIds.has(h.itemId)
  );

  const findComboEnArbol = (itemId: number, parentRecursoId: string): RecursoCosteo | undefined =>
    hermanos.find(h => h.esCombo && h.itemId === itemId && h.comboParentId === parentRecursoId);

  const isCircular = (
    candidateId: number,
    parentItemId: number,
    visited: Set<number> = new Set(),
  ): boolean => {
    if (candidateId === parentItemId) return true;
    if (visited.has(candidateId)) return false;
    visited.add(candidateId);
    const candidate = catalogoItems.find(i => i.id === candidateId);
    if (!candidate?.combosPrincipal?.length) return false;
    return candidate.combosPrincipal.some(c =>
      isCircular(c.productoSecundarioId, parentItemId, visited)
    );
  };


  // resolveCategoria viene de @/lib/utils/combos — wrapper local con fallback a catalogoItems
  const resolveCat = (itemId: number, tipoItem?: number, tipoProducto?: number): RecursoCosteo['categoria'] => {
    const ti = tipoItem ?? catalogoItems.find(i => i.id === itemId)?.tipoItem;
    const tp = tipoProducto ?? catalogoItems.find(i => i.id === itemId)?.tipoProducto;
    return resolveCategoria(ti, tp);
  };

  // ── Handlers combo original ───────────────────────────────────────────────


  const handleAgregar = (
    combo: ComboDisponible,
    parentRecursoId: string,
    calculatedQty: number,
    costoUnitario: number,
  ) => {
    const categoria = resolveCat(combo.productoSecundarioId, combo.tipoItem, combo.tipoProducto);

    const nuevoId = `REC-${Date.now()}-C${combo.productoSecundarioId}`;
    dispatch({
      type: 'ADD_RECURSO',
      payload: {
        nodoId: parentId,
        recurso: {
          id: nuevoId,
          itemId: combo.productoSecundarioId,
          nombre: combo.nombre,
          categoria,
          tipoCosto: 'MENSUAL',
          cantidad: calculatedQty,
          costoUnitario,
          precioVentaUnitario: 0,
          precioVentaOrigen: 'MANUAL',
          esCombo: true,
          comboParentId: parentRecursoId,
          recetas: [],
        },
      },
    });
    setLocalCosts(prev => { const n = { ...prev }; delete n[combo.productoSecundarioId]; return n; });

    if (combo.hijos?.length) {
      let delay = 1;
      for (const hijo of combo.hijos) {
        if (!hijo.nuevoIncluido) continue;
        const hijoQty = calculatedQty * Math.max(1, hijo.nuevoCantidad);
        const hijoId = `REC-${Date.now() + delay++}-C${hijo.productoSecundarioId}`;
        const hijoCategoria = resolveCat(hijo.productoSecundarioId, hijo.tipoItem, hijo.tipoProducto);
        dispatch({
          type: 'ADD_RECURSO',
          payload: {
            nodoId: parentId,
            recurso: {
              id: hijoId,
              itemId: hijo.productoSecundarioId,
              nombre: hijo.nombre,
              categoria: hijoCategoria,
              tipoCosto: 'MENSUAL',
              cantidad: hijoQty,
              costoUnitario: hijo.manejoCostos === 99 ? 0 : (hijo.costosManuales ?? 0),
              precioVentaUnitario: 0,
              precioVentaOrigen: 'MANUAL',
              esCombo: true,
              comboParentId: nuevoId,
              recetas: [],
            },
          },
        });
      }
    }
  };


  const handleQuitar = (comboEnArbol: RecursoCosteo) => {
    dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: comboEnArbol.id } });
  };

  /** Propaga un cambio de cantidad en cascada a todos los hijos combo recursivamente */
  const cascadeQty = (parentRecursoId: string, oldQty: number, newQty: number) => {
    if (oldQty === 0 || newQty === oldQty) return;
    const children = hermanos.filter(r => r.comboParentId === parentRecursoId);
    for (const child of children) {
      const childOldQty = child.cantidad ?? 1;
      const childNewQty = Math.max(1, Math.round(childOldQty * newQty / oldQty));
      dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: child.id, data: { cantidad: childNewQty } } });
      cascadeQty(child.id, childOldQty, childNewQty);
    }
  };

  const handleCambiarCantidad = (enArbol: RecursoCosteo, newQty: number) => {
    if (newQty <= 0) {
      dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: enArbol.id } });
    } else {
      const oldQty = enArbol.cantidad ?? 1;
      dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: enArbol.id, data: { cantidad: newQty } } });
      cascadeQty(enArbol.id, oldQty, newQty);
    }
  };

  const handleCambiarCosto = (enArbol: RecursoCosteo, newCosto: number) => {
    dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: enArbol.id, data: { costoUnitario: newCosto } } });
  };

  const handleEliminarManual = (h: RecursoCosteo) => {
    const collectIds = (id: string): string[] => {
      const hijos = hermanos.filter(r => r.comboParentId === id);
      return [id, ...hijos.flatMap(hijo => collectIds(hijo.id))];
    };
    collectIds(h.id).forEach(id => dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: id } }));
  };

  // ── Handlers sub-item manual ───────────────────────────────────────────────

  /** Resuelve el ItemRow de Costeos a partir de una opción seleccionada (solo source='costeos') */
  const resolveItemDeCosteos = (opcion: ComboItemOpcion): ItemRow | undefined =>
    opcion.itemId ? catalogoItems.find(i => i.id === opcion.itemId) : undefined;

  const handleSubItemSelect = async (val: string) => {
    setSelectedSubItemId(val || '');
    setSelectedOpcion(null);
    setSubItemCosto(0);
    setSubItemSolicitaCosto(false);
    setSubItemSubmitTried(false);
    setAutoCrearError(null);
    if (!val) return;

    // Buscar la opción en la lista unificada
    const opcion = opcionesCombo.find(o => o.value === val);
    if (!opcion) return;
    setSelectedOpcion(opcion);

    if (opcion.source === 'costeos') {
      const item = resolveItemDeCosteos(opcion);
      if (!item) return;
      if (item.manejoCostos === 4) {
        setSubItemSolicitaCosto(true);
      } else if (item.manejoCostos === 2) {
        setIsLoadingSubCosto(true);
        const costos = await getCostosUltimosManual([item.id]);
        setSubItemCosto(costos[item.id] ?? 0);
        setIsLoadingSubCosto(false);
      }
    }
    // Si source='erp': no hay item en Costeos aún; la auto-creación ocurre al agregar
  };

  const handleAgregarManual = async () => {
    setSubItemSubmitTried(true);
    if (!selectedOpcion) return;
    if (subItemSolicitaCosto && subItemCosto === 0) return;

    let itemId: number;
    let itemNombre: string;
    let itemTipoItem: number | undefined;
    let itemTipoProducto: number | undefined;
    let manejoCostosEfectivo: number;

    if (selectedOpcion.source === 'erp') {
      // ── Auto-crear el item en Costeos desde ERP ──────────────────────────
      setIsAutoCreando(true);
      setAutoCrearError(null);
      try {
        const result = await autoCrearItemDesdeERP(selectedOpcion, empresaId);
        if (!result.ok) {
          setAutoCrearError(result.error ?? 'Error al registrar el item del ERP');
          setIsAutoCreando(false);
          return;
        }
        const nuevoItem = result.data;
        // Actualizar la lista de opciones para reflejar el nuevo item de Costeos
        buscarItemsParaCombo('', empresaId, [recurso.itemId]).then(setOpcionesCombo);

        itemId = nuevoItem.id;
        itemNombre = nuevoItem.descripcion;
        itemTipoItem = nuevoItem.tipoItem;
        itemTipoProducto = nuevoItem.tipoProducto;
        manejoCostosEfectivo = nuevoItem.manejoCostos;
      } catch (err) {
        setAutoCrearError('Error al registrar el item desde ERP');
        setIsAutoCreando(false);
        return;
      }
      setIsAutoCreando(false);
    } else {
      // ── Item ya existe en Costeos ────────────────────────────────────────
      const item = resolveItemDeCosteos(selectedOpcion);
      if (!item) return;
      itemId = item.id;
      itemNombre = item.descripcion;
      itemTipoItem = item.tipoItem;
      itemTipoProducto = item.tipoProducto;
      manejoCostosEfectivo = item.manejoCostos;
    }

    const categoria = resolveCat(itemId, itemTipoItem, itemTipoProducto);

    dispatch({
      type: 'ADD_RECURSO',
      payload: {
        nodoId: parentId,
        recurso: {
          id: `REC-${Date.now()}-M${itemId}`,
          itemId,
          nombre: itemNombre,
          categoria,
          tipoCosto: 'MENSUAL',
          cantidad: rootEffectiveQty,
          costoUnitario: subItemCosto,
          precioVentaUnitario: 0,
          precioVentaOrigen: 'MANUAL',
          esCombo: true,
          esComboManual: true,
          comboParentId: recurso.id,
          recetas: [],
        },
      },
    });

    setSelectedSubItemId('');
    setSelectedOpcion(null);
    setSubItemCosto(0);
    setSubItemSolicitaCosto(false);
    setSubItemSubmitTried(false);
    setAutoCrearError(null);
  };

  // ── Componentes internos de render ────────────────────────────────────────

  const TreeGuide = ({ depth }: { depth: number }) => {
    if (depth === 0) return null;
    return (
      <span className="flex items-center shrink-0" style={{ width: depth * 20 }}>
        {Array.from({ length: depth - 1 }).map((_, i) => (
          <span key={i} className="inline-block w-5 shrink-0 border-l border-dashed border-slate-200 h-5" />
        ))}
        <span className="inline-flex items-center shrink-0 w-5">
          <span className="w-5 border-t border-dashed border-slate-300" />
        </span>
      </span>
    );
  };

  /**
   * Renderiza un sub-item agregado manualmente (esComboManual=true).
   * Se usa tanto en el nivel raíz (manualHermanos directos de `recurso`)
   * como anidado dentro de renderComboRow (items manuales bajo un combo hijo).
   */
  const renderManualRow = (h: RecursoCosteo, depth: number): React.ReactNode => {
    const catItem = catalogoItems.find(i => i.id === h.itemId);
    const solicitarCostoManual = catItem?.manejoCostos === 4;
    const qty = h.cantidad ?? 1;

    // El ítem padre del uniforme es Requerido+Incluido: no se puede quitar ni eliminar.
    // Sus hijos (sub-combos del uniforme) se comportan normalmente.
    const esUniformeBloqueado = !!h.esUniforme;

    // Detectar hijos directos de este recurso manual en el árbol del costeo
    const manualChildren = hermanos.filter(h2 => h2.esCombo && h2.comboParentId === h.id);
    const tieneHijos = manualChildren.length > 0;
    const isCollapsedManual = collapsedManualIds.has(h.id);

    return (
      <React.Fragment key={h.id}>
        <tr className="border-t hover:bg-indigo-50/40 bg-indigo-50/20">
          <td className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <TreeGuide depth={depth} />
              {/* Chevron expand/collapse — solo si tiene hijos */}
              {tieneHijos ? (
                <button
                  type="button"
                  onClick={() => toggleManualCollapse(h.id)}
                  className="shrink-0 p-0.5 rounded text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                  title={isCollapsedManual ? 'Expandir' : 'Colapsar'}
                >
                  {isCollapsedManual
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              <span className="text-sm font-medium text-slate-800">{h.nombre}</span>
              <span className="inline-flex items-center text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-500 border border-indigo-200 shrink-0" title="Sub-item agregado manualmente">
                <Pencil className="w-2.5 h-2.5" />
              </span>
              <PendienteBadge hermano={h} />
            </div>
          </td>
          <td className="px-3 py-1.5 text-left w-20">
            <span className="text-xs text-slate-400">{catItem?.unidadMedida ?? '—'}</span>
          </td>
          <td className="px-3 py-1.5 text-center w-28">
            {/* Uniforme padre: cantidad calculada automáticamente (cantidadTurnos × personas), no editable */}
            {esBorrador && !esUniformeBloqueado ? (
              <div className="flex items-center gap-0.5 justify-center">
                <button type="button" onClick={() => handleCambiarCantidad(h, qty - 1)}
                  className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="text-sm font-medium text-slate-700 min-w-[24px] text-center">{qty}</span>
                <button type="button" onClick={() => handleCambiarCantidad(h, qty + 1)}
                  className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-slate-600 font-medium">{qty}</span>
            )}
          </td>
          <td className="px-3 py-1.5 text-right w-28">
            {solicitarCostoManual && esBorrador && !esUniformeBloqueado
              ? <NumericInput value={h.costoUnitario ?? 0} onChange={(val) => handleCambiarCosto(h, val ?? 0)} min="0"
                  className="h-6 w-24 text-right text-xs border-slate-200 bg-white px-1.5 rounded-sm focus-visible:ring-1 focus-visible:ring-blue-400" />
              : <span className="text-sm text-slate-700">{fmt(h.costoUnitario ?? 0)}</span>
            }
          </td>
          <td className="px-3 py-1.5 text-center w-20">
            {/* Uniforme padre: siempre checked+disabled (Requerido+Incluido). Resto: comportamiento normal */}
            <input type="checkbox" checked={true}
              disabled={esUniformeBloqueado || !esBorrador}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={esUniformeBloqueado ? undefined : () => handleQuitar(h)} />
          </td>
          <td className="px-3 py-1.5 text-center w-12">
            {esBorrador && !esUniformeBloqueado ? (
              <button type="button" onClick={() => handleEliminarManual(h)} title="Eliminar sub-item manual"
                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="button" disabled
                title={esUniformeBloqueado ? 'El uniforme no puede eliminarse directamente — cámbialo desde el campo Uniforme' : undefined}
                className="p-1 rounded text-slate-200 cursor-not-allowed">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </td>
        </tr>
        {/* Hijos del item manual — expand/collapse recursivo */}
        {tieneHijos && !isCollapsedManual && manualChildren.map(child => renderManualRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const PendienteBadge = ({ hermano }: { hermano: RecursoCosteo }) => {
    if (!esPendiente(hermano)) return null;
    return (
      <span title="Configuracion pendiente" className="inline-flex items-center shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      </span>
    );
  };

  const renderComboRow = (
    combo: ComboDisponible,
    parentRecursoId: string,
    depth: number,
    parentEffectiveQty: number,
    disabledByParent: boolean = false,
  ): React.ReactNode => {
    const calculatedQty = parentEffectiveQty * Math.max(1, combo.nuevoCantidad);
    const enArbol = disabledByParent ? undefined : findComboEnArbol(combo.productoSecundarioId, parentRecursoId);
    const esRequeridoBloqueado = combo.nuevoRequerido === 1 && combo.nuevoIncluido === 1 && !!enArbol;
    const tieneHijos = (combo.hijos?.length ?? 0) > 0;
    const isCollapsed = collapsedIds.has(combo.productoSecundarioId);
    const recursoIdEnArbol = enArbol?.id ?? '';
    const solicitarCosto = combo.manejoCostos === 4;
    const defaultCosto = combo.manejoCostos === 99 ? 0 : (combo.costosManuales ?? 0);
    const displayQty = enArbol ? (enArbol.cantidad ?? calculatedQty) : calculatedQty;
    const displayCosto = enArbol
      ? (enArbol.costoUnitario ?? defaultCosto)
      : (localCosts[combo.productoSecundarioId] ?? defaultCosto);

    const QtyControls = () => {
      if (!enArbol) return <span className="text-sm text-slate-300">{calculatedQty}</span>;
      if (esRequeridoBloqueado || !esBorrador) return <span className="text-sm text-slate-600 font-medium">{displayQty}</span>;
      return (
        <div className="flex items-center gap-0.5 justify-center">
          <button type="button" onClick={() => handleCambiarCantidad(enArbol, displayQty - 1)}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[24px] text-center">{displayQty}</span>
          <button type="button" onClick={() => handleCambiarCantidad(enArbol, displayQty + 1)}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      );
    };

    const CostoField = () => {
      if (!solicitarCosto) return <span className={`text-sm ${enArbol ? 'text-slate-700' : 'text-slate-300'}`}>{fmt(displayCosto)}</span>;
      if (enArbol && esBorrador) return (
        <NumericInput value={displayCosto} onChange={(val) => handleCambiarCosto(enArbol, val ?? 0)} min="0"
          className="h-6 w-24 text-right text-xs border-slate-200 bg-white px-1.5 rounded-sm focus-visible:ring-1 focus-visible:ring-blue-400" />
      );
      if (!enArbol && esBorrador) return (
        <NumericInput value={displayCosto} onChange={(val) => setLocalCosts(prev => ({ ...prev, [combo.productoSecundarioId]: val ?? 0 }))} min="0"
          className="h-6 w-24 text-right text-xs border-slate-200 bg-slate-50 text-slate-400 px-1.5 rounded-sm focus-visible:ring-1 focus-visible:ring-blue-400" />
      );
      return <span className="text-sm text-slate-400">{fmt(displayCosto)}</span>;
    };

    return (
      <React.Fragment key={`${combo.comboId}-${parentRecursoId}`}>
        <tr className="border-t hover:bg-slate-50/50">
          <td className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <TreeGuide depth={depth} />
              {/* Chevron expand/collapse — solo si tiene hijos */}
              {tieneHijos ? (
                <button
                  type="button"
                  onClick={() => toggleCollapse(combo.productoSecundarioId)}
                  className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title={isCollapsed ? 'Expandir' : 'Colapsar'}
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              <span className={`text-sm ${enArbol ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{combo.nombre}</span>
              {combo.nuevoIncluido === 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 font-medium shrink-0">Opcional</span>
              )}
              {enArbol && <PendienteBadge hermano={enArbol} />}
            </div>
          </td>
          <td className="px-3 py-1.5 text-left w-20">
            <span className={`text-xs ${enArbol ? 'text-slate-500' : 'text-slate-300'}`}>{combo.unidadMedida ?? '—'}</span>
          </td>
          <td className="px-3 py-1.5 text-center w-28"><QtyControls /></td>
          <td className="px-3 py-1.5 text-right w-28"><CostoField /></td>
          <td className="px-3 py-1.5 text-center w-20">
            <input type="checkbox" checked={!!enArbol}
              disabled={esRequeridoBloqueado || !esBorrador || disabledByParent}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={() => { if (enArbol) handleQuitar(enArbol); else handleAgregar(combo, parentRecursoId, displayQty, displayCosto); }}
            />
          </td>
          <td className="px-3 py-1.5 text-center w-12">
            <button type="button" disabled title="Solo los items agregados manualmente se pueden eliminar"
              className="p-1 rounded text-slate-200 cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </td>
        </tr>
        {/* Hijos del catálogo — solo si no está colapsado */}
        {tieneHijos && !isCollapsed && combo.hijos?.map(hijo => renderComboRow(hijo, recursoIdEnArbol, depth + 1, displayQty, disabledByParent || !enArbol))}
        {/* Items manuales anidados: misma lógica que manualHermanos raíz pero a nivel combo hijo.
            NO usa esComboManual (no persiste en BD); excluye itemIds que ya son hijos del catálogo. */}
        {enArbol && !isCollapsed && (() => {
          const catalogChildIds = new Set((combo.hijos ?? []).map(h => h.productoSecundarioId));
          const manualesAnidados = hermanos.filter(
            h => h.esCombo && h.comboParentId === enArbol.id && !catalogChildIds.has(h.itemId)
          );
          return manualesAnidados.map(h => renderManualRow(h, depth + 1));
        })()}
      </React.Fragment>
    );
  };


  // ── Render principal ──────────────────────────────────────────────────────

  const tieneFilas = combosDisponibles.length > 0 || manualHermanos.length > 0;

  return (
    <div className="space-y-3 pt-2">
      {combosDisponibles.length > 0 ? (
        <p className="text-xs text-slate-500">
          Sub-items del combo. Los items <strong>Requeridos</strong> (incluidos con checkbox bloqueado) no pueden quitarse.
          Ajusta la cantidad con los botones +/- <span className="text-slate-400">(cantidad 0 elimina el item del costeo)</span>.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Este item no tiene combo configurado en el sistema. Puedes agregarle sub-items manualmente
          usando el panel de abajo - <strong>aplican solo a este costeo</strong>.
        </p>
      )}

      {tieneFilas && (
        <div className="border rounded-md overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Sub-item</span>
                    {getAllComboIds(combosDisponibles).length > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={expandAll}
                          title="Expandir todo"
                          className="inline-flex items-center gap-0.5 text-[10px] font-normal text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors"
                        >
                          <ChevronsUpDown className="w-3 h-3" />
                          Expandir
                        </button>
                        <button
                          type="button"
                          onClick={collapseAll}
                          title="Colapsar todo"
                          className="inline-flex items-center gap-0.5 text-[10px] font-normal text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors"
                        >
                          <ChevronsDownUp className="w-3 h-3" />
                          Colapsar
                        </button>
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-20">Medida</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-28">Cantidad</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-28">Costo</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-20">Incluido</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {combosDisponibles.map(combo => renderComboRow(combo, recurso.id, 0, rootEffectiveQty))}
              {/* Items manuales directos de este recurso (depth 0) */}
              {manualHermanos.map(h => renderManualRow(h, 0))}
            </tbody>
          </table>
        </div>
      )}

      {esBorrador && (
        <div className="border rounded-md bg-slate-50">
          <button type="button" onClick={() => setShowAgregar(prev => !prev)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors">
            <PlusCircle className="w-3.5 h-3.5" />
            Agregar Sub-item
            {syncHabilitado && (
              <span className="ml-1 text-[10px] font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
                + ERP
              </span>
            )}
            <span className="ml-auto text-slate-400 font-normal">{showAgregar ? '▲' : '▼'}</span>
          </button>

          {showAgregar && (
            <div className="px-3 pb-3 pt-2 border-t bg-white space-y-3">
              {/* Error de auto-creación ERP */}
              {autoCrearError && (
                <div className="text-red-500 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  {autoCrearError}
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-7 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    Item
                    {isSearching && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                  </label>
                  <SearchableSelect
                    options={opcionesCombo
                      .filter(o => {
                        if (o.source === 'costeos' && o.itemId) {
                          const item = catalogoItems.find(i => i.id === o.itemId);
                          if (item?.tipoItem === 6) return false;
                          if (isCircular(o.itemId, recurso.itemId, new Set())) return false;
                        }
                        return true;
                      })
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedSubItemId}
                    onChange={handleSubItemSelect}
                    onSearchChange={syncHabilitado ? handleSearchChange : undefined}
                    placeholder="Seleccionar item..."
                  />
                  {/* Info del item ERP seleccionado */}
                  {selectedOpcion?.source === 'erp' && (
                    <p className="text-[10px] text-emerald-600 leading-none !mt-0.5">
                      ✦ Item del ERP — se registrará automáticamente en Costeos al agregar
                    </p>
                  )}
                  {selectedOpcion?.source !== 'erp' && (
                    <p className="text-[10px] leading-none invisible select-none">_</p>
                  )}
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  {(() => {
                    const showError = subItemSubmitTried && subItemSolicitaCosto && subItemCosto === 0;
                    return (
                      <>
                        <label className={`text-xs font-medium ${showError ? 'text-red-500' : 'text-slate-600'}`}>
                          Costo{isLoadingSubCosto && <span className="text-slate-400"> (cargando...)</span>}
                        </label>
                        {subItemSolicitaCosto
                          ? <NumericInput value={subItemCosto} onChange={(val) => setSubItemCosto(val ?? 0)} min="0"
                              className={`flex h-8 w-full rounded-sm border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 bg-white ${showError ? 'border-red-400 focus-visible:ring-red-400' : 'border-indigo-300 focus-visible:ring-indigo-500'}`} />
                          : <input type="text" readOnly tabIndex={-1}
                              value={subItemCosto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              className="flex h-8 w-full rounded-sm border border-slate-200 bg-slate-100 text-slate-500 px-2 py-1 text-sm outline-none cursor-not-allowed" />
                        }
                        <p className={`text-[10px] leading-none !mt-0.5 ${showError ? 'text-red-500' : 'invisible select-none'}`}>
                          {showError ? 'Debe ser mayor que 0' : '_'}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium invisible select-none">_</label>
                  <button type="button"
                    onClick={handleAgregarManual}
                    disabled={isAutoCreando || !selectedSubItemId}
                    className="w-full h-8 flex items-center justify-center gap-1 rounded-sm bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {isAutoCreando
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Registrando...</>
                      : <><Plus className="w-3.5 h-3.5" />Agregar</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
