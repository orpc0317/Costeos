"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { NumericInput } from '@/components/ui/numeric-input';
import { normalizeText } from '@/lib/utils/text';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDepartamentosERP, getMunicipiosERP, getTurnosERP, getClienteDireccionesERP } from '@/app/actions/erp';

import type { ErpTurno, ErpServicioVenta, ErpDireccionOperativa } from '@/lib/erp';

import { AddressLookupModal } from './modals/AddressLookupModal';
import { Search } from 'lucide-react';
import { MapPin, Settings2, Calculator, Trash2, CornerUpRight, Gift, Layers, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { RecursosSummaryTable } from './RecursosSummaryTable';
import { ConfirmDeleteDialog } from './modals/ConfirmDeleteDialog';
import { MoveNodeDialog } from './modals/MoveNodeDialog';
import { TurnoCard } from './TurnoCard';
import { ComboTab } from './ComboTab';
import { NodoCosteo, RecursoCosteo, ComboDisponible } from '@/lib/types/costeos';
import { listarItems, getCostosUltimosManual } from '@/app/actions/items';
import { listarTiposComboRHPorEmpresa } from '@/app/actions/tipos-combo-rh';
import { listarTiposCombosPorEmpresa } from '@/app/actions/tipos-combo';
import type { ItemRow } from '@/lib/types/items';
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh';
import { buildCombosDisponibles } from '@/lib/utils/combos';
import { FieldError } from '@/components/ui/field-error';
import { resolverCostosProyecto, type ItemParaCostear } from '@/app/actions/costear';
import { SolicitarCostosModal, type ItemSolicitarCosto } from './modals/SolicitarCostosModal';
import { FuenteCostoPanel } from './FuenteCostoPanel';


const OPCIONES_CUBRE_DESCANSO = [
  { value: '0', label: '0 - No Aplica' },
  { value: '1', label: '1 - Descansero' },
  { value: '2', label: '2 - Extrero' },
  { value: '3', label: '3 - Bono Descanso' }
];

export default function EditorPanel() {
  const { proyecto, selectedNode, dispatch } = useCosteo();

  if (!proyecto) return null;

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
        <p>Selecciona un elemento en el árbol para editarlo</p>
      </div>
    );
  }

  const tc = proyecto.tipoCosteo;
  const maxNiveles = tc?.cantidadNiveles ?? 2;
  const etiquetas = tc?.etiquetasNiveles ? tc.etiquetasNiveles.split(',') : [];
  const lblR = tc?.lineaEtiqueta || 'Línea';

  let nodeData: any = null;
  let title = '';
  let parentId: string | null = null;
  let pathNames: string[] = [];
  
  // Buscar nodo recursivamente
  const findNodo = (nodos: NodoCosteo[], id: string, currentPath: string[]): NodoCosteo | null => {
    for (const n of nodos) {
      if (n.id === id) {
        pathNames = [...currentPath, n.nombre];
        return n;
      }
      const found = findNodo(n.nodos, id, [...currentPath, n.nombre]);
      if (found) return found;
    }
    return null;
  };

  const findParentOfNodo = (nodos: NodoCosteo[], targetId: string, currentParentId: string | null = null): string | null => {
    for (const n of nodos) {
      if (n.id === targetId) return currentParentId;
      const found = findParentOfNodo(n.nodos, targetId, n.id);
      if (found !== null) return found;
    }
    return null;
  };

  const findRecurso = (nodos: NodoCosteo[], id: string, currentPath: string[]): { recurso: RecursoCosteo, parentId: string } | null => {
    for (const n of nodos) {
      const r = n.recursos.find(rec => rec.id === id);
      if (r) {
        pathNames = [...currentPath, n.nombre];
        return { recurso: r, parentId: n.id };
      }
      const found = findRecurso(n.nodos, id, [...currentPath, n.nombre]);
      if (found) return found;
    }
    return null;
  };

  if (selectedNode.type === 'PROYECTO') {
    nodeData = proyecto;
    title = 'Configuración Proyecto';
  } else if (selectedNode.type === 'NODO') {
    const n = findNodo(proyecto.nodos, selectedNode.id, []);
    if (n) {
      nodeData = n;
      parentId = findParentOfNodo(proyecto.nodos, n.id, null);
      title = `Detalles ${etiquetas[n.nivel - 1] || `Nivel ${n.nivel}`}`;
    }
  } else if (selectedNode.type === 'RECURSO') {
    // Check in root first
    const rRoot = proyecto.recursos.find(r => r.id === selectedNode.id);
    if (rRoot) {
      nodeData = rRoot;
      parentId = null;
      title = `Detalle ${nodeData.nombre}`;
    } else {
      const res = findRecurso(proyecto.nodos, selectedNode.id, []);
      if (res) {
        nodeData = res.recurso;
        parentId = res.parentId;
        title = `Detalle ${nodeData.nombre}`;
      }
    }
  }

  if (!nodeData) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <p>Elemento no encontrado</p>
      </div>
    );
  }

  const handleChange = (field: string | Record<string, any>, value?: any) => {
    let data: Record<string, any> = {};
    if (typeof field === 'string') {
      let finalValue = value;
      if (typeof finalValue === 'string' && field !== 'id') {
        finalValue = normalizeText(finalValue);
      }
      data[field] = finalValue;
    } else {
      data = field;
    }
    
    if (selectedNode.type === 'PROYECTO') {
      dispatch({ type: 'UPDATE_PROYECTO', payload: data });
    } else if (selectedNode.type === 'NODO') {
      dispatch({ type: 'UPDATE_NODO', payload: { id: selectedNode.id, data } });
    } else if (selectedNode.type === 'RECURSO') {
      dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: selectedNode.id, data } });

      // ── Helper: recursos planos del nodo actual ───────────────────────────
      const getNodoRecursos = (): RecursoCosteo[] => {
        if (!parentId) return proyecto.recursos;
        const findNodo = (nodos: NodoCosteo[], id: string): NodoCosteo | null => {
          for (const n of nodos) {
            if (n.id === id) return n;
            const f = findNodo(n.nodos, id);
            if (f) return f;
          }
          return null;
        };
        return findNodo(proyecto.nodos, parentId)?.recursos ?? [];
      };

      // ── Cascada de cantidad a combos hijos cuando cambia 'cantidad' o 'personas' (RH) ──
      const cambiaCantidad = 'cantidad' in data;
      const cambiaPersonas = 'personas' in data;
      if ((cambiaCantidad || cambiaPersonas) && nodeData) {
        const isRH = nodeData.categoria === 'RECURSO_HUMANO';
        const oldCantidad = nodeData.cantidad ?? 1;
        const oldPersonas = nodeData.personas ?? 1;
        const newCantidad = (cambiaCantidad ? (data.cantidad as number) : oldCantidad) ?? 1;
        const newPersonas = (cambiaPersonas ? (data.personas as number) : oldPersonas) ?? 1;

        // Efectiva del root: para RH es cantidad × personas; para otros, solo cantidad
        const oldEfectiva = isRH ? oldCantidad * oldPersonas : oldCantidad;
        const newEfectiva = isRH ? newCantidad * newPersonas : newCantidad;

        if (newEfectiva !== oldEfectiva && oldEfectiva > 0) {
          const nodoRecursos = getNodoRecursos();
          const cascadeComboQty = (parentRecursoId: string, oQty: number, nQty: number) => {
            nodoRecursos
              .filter(r => r.comboParentId === parentRecursoId)
              .forEach(child => {
                const childOld = child.cantidad ?? 1;
                const childNew = Math.max(1, Math.round(childOld * nQty / oQty));
                dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: child.id, data: { cantidad: childNew } } });
                cascadeComboQty(child.id, childOld, childNew);
              });
          };
          cascadeComboQty(selectedNode.id, oldEfectiva, newEfectiva);
        }
      }

      // ── Cambio de Combo RH: sustituir combo del tipo anterior por el nuevo ──
      const cambiaComboRH = 'combosRhSeleccionados' in data;
      const cambiaUniforme = 'uniformeCodigo' in data; // keep for old data compat

      if ((cambiaComboRH || cambiaUniforme) && nodeData && nodeData.categoria === 'RECURSO_HUMANO') {
        const nodoRecursos = getNodoRecursos();
        const factorCosto = (nodeData.cantidad ?? 1) * (nodeData.personas ?? 1);

        if (cambiaComboRH) {
          const oldCombos = nodeData.combosRhSeleccionados ?? {};
          const newCombos = (data as any).combosRhSeleccionados ?? {};

          // For each tipo, check if the selection changed
          for (const tipo of tiposComboRH) {
            const oldItemId = oldCombos[String(tipo.id)] ? parseInt(oldCombos[String(tipo.id)], 10) : NaN;
            const newItemId = newCombos[String(tipo.id)] ? parseInt(newCombos[String(tipo.id)], 10) : NaN;

            if (oldItemId === newItemId) continue; // no change for this type

            // 1. Remove old combo child for this tipo
            if (!isNaN(oldItemId)) {
              const oldComboRecurso = nodoRecursos.find(
                r => r.esCombo && r.comboParentId === selectedNode.id && r.itemId === oldItemId && r.esComboRHId === tipo.id
              );
              // Also handle legacy esUniforme=true case
              const oldLegacy = !oldComboRecurso && tipo.nombre === 'UNIFORME'
                ? nodoRecursos.find(r => r.esCombo && r.comboParentId === selectedNode.id && r.itemId === oldItemId && r.esUniforme)
                : null;
              if (oldComboRecurso) dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: oldComboRecurso.id } });
              if (oldLegacy) dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: oldLegacy.id } });
            }

            // 2. Add new combo child for this tipo
            if (!isNaN(newItemId) && newItemId > 0) {
              const newComboItem = catalogoItems.find(i => i.id === newItemId);
              if (newComboItem) {
                const comboRecursoId = `REC-${Date.now()}-RH${tipo.id}`;
                let comboCat: RecursoCosteo['categoria'] = 'ARTICULO';
                if (newComboItem.tipoItem === 4) comboCat = 'EQUIPO';
                if (newComboItem.tipoItem === 3)
                  comboCat = newComboItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

                dispatch({
                  type: 'ADD_RECURSO',
                  payload: {
                    nodoId: parentId,
                    recurso: {
                      id: comboRecursoId,
                      itemId: newComboItem.id,
                      nombre: newComboItem.descripcion,
                      categoria: comboCat,
                      tipoCosto: 'MENSUAL',
                      cantidad: factorCosto,
                      costoUnitario: 0,
                      precioVentaUnitario: 0,
                      precioVentaOrigen: 'MANUAL',
                      esCombo: true,
                      esComboRHId: tipo.id,
                      esUniforme: tipo.nombre === 'UNIFORME',
                      comboParentId: selectedNode.id,
                      recetas: [],
                    },
                  },
                });

                // Sub-combos of the new combo item
                for (const subCombo of newComboItem.combosPrincipal ?? []) {
                  if (!subCombo.nuevoIncluido || Number(subCombo.nuevoCantidad) <= 0) continue;
                  const secItem = catalogoItems.find(i => i.id === subCombo.productoSecundarioId);
                  if (!secItem) continue;
                  let secCat: RecursoCosteo['categoria'] = 'SERVICIO';
                  if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
                  if (secItem.tipoItem === 4) secCat = 'EQUIPO';
                  if (secItem.tipoItem === 3)
                    secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
                  dispatch({
                    type: 'ADD_RECURSO',
                    payload: {
                      nodoId: parentId,
                      recurso: {
                        id: `REC-${Date.now()}-RH${tipo.id}C${subCombo.productoSecundarioId}`,
                        itemId: secItem.id,
                        nombre: secItem.descripcion,
                        categoria: secCat,
                        tipoCosto: 'MENSUAL',
                        cantidad: Math.max(1, Math.round(Number(subCombo.nuevoCantidad) * factorCosto)),
                        costoUnitario: 0,
                        precioVentaUnitario: 0,
                        precioVentaOrigen: 'MANUAL',
                        esCombo: true,
                        comboParentId: comboRecursoId,
                        recetas: [],
                      },
                    },
                  });
                }
              }
            }
          }
        } else if (cambiaUniforme) {
          // Legacy backward compat: handle uniformeCodigo change for old costeos

          // 1. Eliminar el recurso del uniforme anterior y toda su cadena de descendientes
          const oldUnifItemId = nodeData.uniformeCodigo ? parseInt(nodeData.uniformeCodigo, 10) : NaN;
          if (!isNaN(oldUnifItemId)) {
            const oldUnifRecurso = nodoRecursos.find(
              r => r.esCombo && r.comboParentId === selectedNode.id && r.itemId === oldUnifItemId
            );
            if (oldUnifRecurso) {
              // REMOVE_RECURSO del context ya elimina recursivamente todos los descendientes
              dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: oldUnifRecurso.id } });
            }
          }

          // 2. Agregar el nuevo uniforme y sus combos (si se seleccionó uno)
          const newUnifItemId = data.uniformeCodigo ? parseInt(data.uniformeCodigo, 10) : NaN;
          if (!isNaN(newUnifItemId) && newUnifItemId > 0) {
            const unifItem = catalogoItems.find(i => i.id === newUnifItemId);
            if (unifItem) {
              // Factor = cantidadTurnos × personas (los valores actuales del recurso, no cambian aquí)
              const unifRecursoId = `REC-${Date.now()}-UNIF`;

              let unifCat: RecursoCosteo['categoria'] = 'ARTICULO';
              if (unifItem.tipoItem === 4) unifCat = 'EQUIPO';
              if (unifItem.tipoItem === 3)
                unifCat = unifItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

              // Agregar el uniforme como combo hijo del primario
              dispatch({
                type: 'ADD_RECURSO',
                payload: {
                  nodoId: parentId,
                  recurso: {
                    id: unifRecursoId,
                    itemId: unifItem.id,
                    nombre: unifItem.descripcion,
                    categoria: unifCat,
                    tipoCosto: 'MENSUAL',
                    cantidad: factorCosto,
                    costoUnitario: 0,
                    precioVentaUnitario: 0,
                    precioVentaOrigen: 'MANUAL',
                    esCombo: true,
                    esUniforme: true,
                    comboParentId: selectedNode.id,
                    recetas: [],
                  },
                },
              });

              // Agregar los sub-combos del uniforme, escalados por factorCosto
              for (const combo of unifItem.combosPrincipal ?? []) {
                if (!combo.nuevoIncluido || Number(combo.nuevoCantidad) <= 0) continue;
                const secItem = catalogoItems.find(i => i.id === combo.productoSecundarioId);
                if (!secItem) continue;

                let secCat: RecursoCosteo['categoria'] = 'SERVICIO';
                if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
                if (secItem.tipoItem === 4) secCat = 'EQUIPO';
                if (secItem.tipoItem === 3)
                  secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';

                dispatch({
                  type: 'ADD_RECURSO',
                  payload: {
                    nodoId: parentId,
                    recurso: {
                      id: `REC-${Date.now()}-UNIFC${combo.productoSecundarioId}`,
                      itemId: secItem.id,
                      nombre: secItem.descripcion,
                      categoria: secCat,
                      tipoCosto: 'MENSUAL',
                      cantidad: Math.max(1, Math.round(Number(combo.nuevoCantidad) * factorCosto)),
                      costoUnitario: 0,
                      precioVentaUnitario: 0,
                      precioVentaOrigen: 'MANUAL',
                      esCombo: true,
                      comboParentId: unifRecursoId,
                      recetas: [],
                    },
                  },
                });
              }
            }
          }
        }
      }
    }
  };



  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [turnos, setTurnos] = useState<ErpTurno[]>([]);
  const [bonosDisponibles, setBonosDisponibles] = useState<{ codigo: string; descripcion: string; costo: number }[]>([]);
  const [selectedBonoId, setSelectedBonoId] = useState<string>('');

  // Catálogo de ítems: se carga una sola vez para computar combosDisponibles
  // en recursos que vienen de BD y no traen el campo precomputado
  const [catalogoItems, setCatalogoItems] = useState<ItemRow[]>([]);
  const [combosComputados, setCombosComputados] = useState<ComboDisponible[] | null>(null);
  const [tiposComboRH, setTiposComboRH] = useState<TipoComboRHRow[]>([]);
  // Mapa id→nombre de TiposCombos de la empresa (nueva arquitectura)
  const [tiposCombosNombres, setTiposCombosNombres] = useState<Record<number, string>>({});
  // Controla si el usuario incluyó cada item adicional opcional (obligatorio=false)
  // undefined = derivado de si ya existe un recurso hijo; true/false = elección explícita del usuario
  const [combosOptIncluidos, setCombosOptIncluidos] = useState<Record<number, boolean | undefined>>({});

  // ── Estado del proceso Costear ────────────────────────────────────────────
  type CostearEstado = 'idle' | 'loading' | 'solicitando' | 'done' | 'error';
  const [costearEstado, setCostearEstado] = useState<CostearEstado>('idle');
  const [costearResultado, setCostearResultado] = useState<{
    sinCosto: { itemId: number; nombre: string; motivo: string }[];
  } | null>(null);
  const [itemsSolicitar, setItemsSolicitar] = useState<ItemSolicitarCosto[]>([]);
  const [pendingItems, setPendingItems] = useState<ItemParaCostear[]>([]);

  /**
   * Recopila todos los ítems únicos del árbol del proyecto con su manejoCostos.
   */
  const recopilarItemsDelArbol = (): ItemParaCostear[] => {
    if (!proyecto) return [];
    const mapaItems = new Map<number, ItemParaCostear>();

    const procesarRecurso = (r: RecursoCosteo) => {
      if (!mapaItems.has(r.itemId)) {
        // Buscar en el catálogo para obtener manejoCostos y costoReferenciaItemId
        const itemCatalogo = catalogoItems.find(i => i.id === r.itemId);
        mapaItems.set(r.itemId, {
          itemId:               r.itemId,
          manejoCostos:         itemCatalogo?.manejoCostos ?? 0,
          costoReferenciaItemId: itemCatalogo?.costoReferenciaItemId ?? null,
          cotizacionScope:      itemCatalogo?.cotizacionScope ?? 'GENERAL',
          porCosteo:            itemCatalogo?.porCosteo ?? 0,
        });
      }
    };

    const walkNodos = (nodos: NodoCosteo[]) => {
      for (const n of nodos) {
        n.recursos.forEach(procesarRecurso);
        walkNodos(n.nodos);
      }
    };

    proyecto.recursos.forEach(procesarRecurso);
    walkNodos(proyecto.nodos);

    return Array.from(mapaItems.values());
  };

  /**
   * Recopila los ítems "Solicitar Usuario" (manejoCostos=4) que tienen costo=0
   * en TODOS los recursos del árbol. Si un ítem tiene al menos un recurso con
   * costo>0, no se solicita (ya fue ingresado antes).
   */
  const recopilarItemsSolicitarSinCosto = (items: ItemParaCostear[]): ItemSolicitarCosto[] => {
    if (!proyecto) return [];

    // Mapa itemId → { costoMax, cantidadTotal }
    const itemStats = new Map<number, { costoMax: number; cantidadTotal: number }>();

    const procesarRecurso = (r: RecursoCosteo) => {
      const itemCatalogo = catalogoItems.find(i => i.id === r.itemId);
      if (itemCatalogo?.manejoCostos !== 4) return;
      const prev = itemStats.get(r.itemId) ?? { costoMax: 0, cantidadTotal: 0 };
      itemStats.set(r.itemId, {
        costoMax:       Math.max(prev.costoMax, r.costoUnitario ?? 0),
        cantidadTotal:  prev.cantidadTotal + (r.cantidad ?? 1),
      });
    };

    const walkNodos = (nodos: NodoCosteo[]) => {
      for (const n of nodos) {
        n.recursos.forEach(procesarRecurso);
        walkNodos(n.nodos);
      }
    };
    proyecto.recursos.forEach(procesarRecurso);
    walkNodos(proyecto.nodos);

    return items
      .filter(i => i.manejoCostos === 4)
      .map(i => {
        const stats   = itemStats.get(i.itemId);
        const nombre  = catalogoItems.find(c => c.id === i.itemId)?.descripcion ?? `Ítem ${i.itemId}`;
        return {
          itemId:      i.itemId,
          nombre,
          cantidad:    stats?.cantidadTotal ?? 0,
          costoActual: stats?.costoMax ?? 0,
        };
      })
      // Solo los que tienen costoActual=0 (nunca se ingresó)
      .filter(i => i.costoActual === 0);
  };

  /**
   * Ejecuta el proceso de costeo completo.
   * Si hay ítems "Solicitar" sin costo, primero muestra el modal.
   */
  const handleCostear = async (costosSolicitar: Record<number, number> = {}) => {
    if (!proyecto) return;

    const allItems = recopilarItemsDelArbol();

    // Si aún no hemos preguntado por los ítems Solicitar, detectar y preguntar
    if (Object.keys(costosSolicitar).length === 0) {
      const solicitarSinCosto = recopilarItemsSolicitarSinCosto(allItems);
      if (solicitarSinCosto.length > 0) {
        setItemsSolicitar(solicitarSinCosto);
        setPendingItems(allItems);
        setCostearEstado('solicitando');
        return; // Esperar la respuesta del modal
      }
    }

    // Ejecutar el costeo
    setCostearEstado('loading');
    setCostearResultado(null);

    try {
      const costeoId = parseInt(proyecto.id, 10);
      const result = await resolverCostosProyecto(costeoId, allItems, costosSolicitar);

      if (!result.ok) {
        setCostearEstado('error');
        return;
      }

      // Actualizar todos los costos en el árbol de una sola vez
      dispatch({ type: 'ACTUALIZAR_COSTOS_MASIVO', payload: result.data.costosResueltos });

      setCostearResultado({ sinCosto: result.data.sinCosto });
      setCostearEstado('done');

      // Resetear el estado después de 8 segundos
      setTimeout(() => {
        setCostearEstado('idle');
        setCostearResultado(null);
      }, 8000);
    } catch (err) {
      console.error('[handleCostear] Error:', err);
      setCostearEstado('error');
    }
  };

  // Uniformes: ítems del catálogo Costeos con bandera uniforme=1 (derivado, sin llamada ERP)
  // Mantenido para compatibilidad con costeos viejos que usan uniformeCodigo
  const uniformesItems = catalogoItems.filter(i => i.uniforme === 1);

  useEffect(() => {
    let active = true;
    if (proyecto?.empresaId) {
      Promise.all([
        getTurnosERP(proyecto.empresaId),
        listarTiposComboRHPorEmpresa(proyecto.empresaId),
        listarTiposCombosPorEmpresa(proyecto.empresaId),
      ]).then(([turnosData, tiposData, tiposCombosData]) => {
        if (!active) return;
        setTurnos(turnosData);
        setTiposComboRH(tiposData);
        const nombresMap: Record<number, string> = {};
        tiposCombosData.forEach(t => { nombresMap[t.id] = t.nombre; });
        setTiposCombosNombres(nombresMap);
      });
    }
    return () => { active = false; };
  }, [proyecto?.empresaId]);

  // Cargar catálogo de ítems una sola vez (no depende de empresaId — el filtro lo hace el service)
  useEffect(() => {
    let active = true;
    listarItems().then(data => {
      if (!active) return;
      setCatalogoItems(data);
      // Bonos (tipoItem=6) — derivados del mismo catálogo, sin llamada extra
      setBonosDisponibles(
        data
          .filter(i => i.tipoItem === 6)
          .map(i => ({
            codigo:      i.codigoErp ?? String(i.id),
            descripcion: i.descripcion,
            costo:       0,  // el costo real se carga desde el historial de precios al seleccionar

          }))
      );
    });
    return () => { active = false; };
  }, []);

  // Cuando se selecciona un recurso sin combosDisponibles (cargado desde BD),
  // computarlo a partir del catálogo local. Aplica a primarios Y a combos — ambos
  // pueden tener sub-combos configurables.
  useEffect(() => {
    if (
      selectedNode?.type !== 'RECURSO' ||
      !nodeData?.itemId ||
      catalogoItems.length === 0
    ) {
      setCombosComputados(null);
      return;
    }
    // Si ya viene precomputado (recurso creado en esta sesión), no hacer nada
    if (nodeData.combosDisponibles) {
      setCombosComputados(null);
      return;
    }
    // Buscar el ítem en el catálogo local por itemId
    const item = catalogoItems.find(i => i.id === nodeData.itemId);
    if (!item?.combosPrincipal?.length) {
      setCombosComputados(null);
      return;
    }
    // Obtener costos manuales de los sub-ítems que los necesiten
    const idsConManual = item.combosPrincipal
      .filter(c => {
        const sec = catalogoItems.find(i => i.id === c.productoSecundarioId);
        return sec?.manejoCostos === 2;
      })
      .map(c => c.productoSecundarioId);

    let active = true;
    if (idsConManual.length > 0) {
      getCostosUltimosManual(idsConManual).then(costos => {
        if (!active) return;
        setCombosComputados(buildCombosDisponibles(item.combosPrincipal!, catalogoItems, costos));
      });
    } else {
      setCombosComputados(buildCombosDisponibles(item.combosPrincipal, catalogoItems, {}));
    }
    return () => { active = false; };
  }, [selectedNode?.id, nodeData?.itemId, nodeData?.combosDisponibles, catalogoItems]);

  const confirmDelete = () => {
    if (selectedNode.type === 'NODO') {
      dispatch({ type: 'REMOVE_NODO', payload: selectedNode.id });
    } else if (selectedNode.type === 'RECURSO') {
      dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: selectedNode.id } });
    }
    dispatch({ type: 'SELECT_NODE', payload: { type: 'PROYECTO', id: proyecto.id } });
    setIsDeleteDialogOpen(false);
  };

  // Mapa tipoId → items del catálogo disponibles para ese tipo (solo rol DISPONIBLE)
  const itemsPorTipoComboRH = useMemo(() => {
    const map: Record<number, ItemRow[]> = {};
    for (const tipo of tiposComboRH) {
      map[tipo.id] = catalogoItems.filter(item =>
        item.tiposComboRH?.some(t => t.tipoComboRHId === tipo.id && t.rol === 'DISPONIBLE')
      );
    }
    return map;
  }, [tiposComboRH, catalogoItems]);

  // Tipos de combo RH que el ítem RH necesita (rol NECESITA) — determina qué selects mostrar
  const tiposComboRHDelItem = useMemo(() => {
    if (!nodeData || nodeData.categoria !== 'RECURSO_HUMANO' || nodeData.esCombo) return [];
    const currentItem = catalogoItems.find(i => i.id === nodeData.itemId);
    return tiposComboRH.filter(t =>
      currentItem?.tiposComboRH?.some(pt => pt.tipoComboRHId === t.id && pt.rol === 'NECESITA')
    );
  }, [nodeData, tiposComboRH, catalogoItems]);

  // Nueva arquitectura: Tipos Combo del ítem primario seleccionado
  const currentItemCatalogo = useMemo(() =>
    nodeData?.itemId ? catalogoItems.find(i => i.id === nodeData.itemId) : undefined,
    [nodeData?.itemId, catalogoItems]
  );

  // ítems disponibles por TipoCombo — filtrados por tipoComboId en Parámetros del ítem
  const itemsPorTipoCombo = useMemo(() => {
    const map: Record<number, ItemRow[]> = {};
    if (!currentItemCatalogo?.tiposCombo) return map;
    for (const asoc of currentItemCatalogo.tiposCombo) {
      map[asoc.tipoComboId] = catalogoItems
        .filter(i => i.tipoComboId === asoc.tipoComboId)
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    }
    return map;
  }, [currentItemCatalogo, catalogoItems]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {pathNames.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {pathNames.join(' > ')}
            </p>
          )}
          <p className="text-slate-500 mt-2 text-sm font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">ID: {nodeData.id}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-hidden">
        
        {selectedNode.type === 'PROYECTO' && (
          <div className="p-6 pt-4 overflow-y-auto h-full w-full">
          <div className="max-w-4xl">
            <Tabs defaultValue="general" className="w-full">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Settings2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="resumen">
                  <Calculator className="w-4 h-4 mr-2" />
                  Resumen
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-3 outline-none min-h-[250px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre Proyecto</Label>
                    <Input
                      type="text"
                      value={nodeData.nombreProyecto}
                      onChange={(e) => handleChange('nombreProyecto', normalizeText(e.target.value))}
                      aria-invalid={!nodeData.nombreProyecto?.trim()}
                    />
                  </div>
                  <div>
                    <Label>Plazo (meses)</Label>
                    <NumericInput 
                      value={nodeData.plazoMeses}
                      isInteger={true}
                      disabled={nodeData.tipoCosteo?.manejoPlazo === 'FIJO' || nodeData.tipoCosteo?.manejoPlazo === 'NO_APLICA'}
                      onChange={(val) => handleChange('plazoMeses', val)} 
                    />
                  </div>
                  <div>
                    <Label>Overhead (%)</Label>
                    <NumericInput 
                      value={nodeData.porcentajeOverhead} 
                      onChange={(val) => handleChange('porcentajeOverhead', val)} 
                    />
                  </div>
                  <div>
                    <Label>Contingencia (%)</Label>
                    <NumericInput 
                      value={nodeData.porcentajeContingencia} 
                      onChange={(val) => handleChange('porcentajeContingencia', val)} 
                    />
                  </div>
                </div>

                {/* ── Sección Costear ────────────────────────────────────── */}
                <div className="pt-4 border-t mt-2">
                  <div className="flex items-center mb-3 min-h-[24px]">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-l-2 border-indigo-500 pl-2 leading-none">
                      COSTEO
                    </h3>
                    <div className="flex-1 border-t border-indigo-200 ml-3 mt-0.5" />
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    Ejecuta el proceso de costeo del proyecto. El sistema buscará y actualizará
                    el costo unitario de cada ítem según su configuración de manejo de costos.
                  </p>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleCostear()}
                      disabled={costearEstado === 'loading'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {costearEstado === 'loading' ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Costeando...</>
                      ) : (
                        <><Calculator className="h-4 w-4 mr-2" />Costear Proyecto</>
                      )}
                    </Button>

                    {costearEstado === 'done' && costearResultado && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Costeo completado
                      </span>
                    )}

                    {costearEstado === 'error' && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Error al costear
                      </span>
                    )}
                  </div>

                  {/* Panel de resultados: ítems sin costo */}
                  {costearEstado === 'done' && costearResultado && costearResultado.sinCosto.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-sm font-medium text-amber-700">
                          {costearResultado.sinCosto.length} ítem{costearResultado.sinCosto.length !== 1 ? 's' : ''} sin costo
                        </p>
                      </div>
                      <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                        {costearResultado.sinCosto.map(item => (
                          <li key={item.itemId} className="text-xs text-amber-700 flex gap-2">
                            <span className="font-medium truncate">{item.nombre}</span>
                            <span className="text-amber-500 shrink-0">— {item.motivo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {costearEstado === 'done' && costearResultado && costearResultado.sinCosto.length === 0 && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <p className="text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Todos los ítems tienen costo asignado.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Solicitar Costos — se monta aquí en el árbol del componente */}
                <SolicitarCostosModal
                  open={costearEstado === 'solicitando'}
                  items={itemsSolicitar}
                  onConfirm={(costos) => {
                    setCostearEstado('idle');
                    // Continuar el proceso con los costos proporcionados por el usuario
                    // Usamos pendingItems para no recompilar el árbol (evitar inconsistencia)
                    void (async () => {
                      setCostearEstado('loading');
                      setCostearResultado(null);
                      try {
                        const costeoId = parseInt(proyecto.id, 10);
                        const result = await resolverCostosProyecto(costeoId, pendingItems, costos);
                        if (!result.ok) { setCostearEstado('error'); return; }
                        dispatch({ type: 'ACTUALIZAR_COSTOS_MASIVO', payload: result.data.costosResueltos });
                        setCostearResultado({ sinCosto: result.data.sinCosto });
                        setCostearEstado('done');
                        setTimeout(() => { setCostearEstado('idle'); setCostearResultado(null); }, 8000);
                      } catch { setCostearEstado('error'); }
                    })();
                  }}
                  onCancel={() => setCostearEstado('idle')}
                />
              </TabsContent>
              
              <TabsContent value="resumen" className="outline-none">
                {(() => {
                  const allRecursos: any[] = [];
                  const walk = (nodos: NodoCosteo[], path: string[]) => {
                    for (const n of nodos) {
                      const newPath = [...path, n.nombre];
                      n.recursos.forEach(r => allRecursos.push({ ...r, _path: newPath }));
                      walk(n.nodos, newPath);
                    }
                  };
                  proyecto.recursos.forEach(r => allRecursos.push({ ...r, _path: ['Proyecto'] }));
                  walk(proyecto.nodos, []);
                  return <RecursosSummaryTable recursos={allRecursos} />;
                })()}
              </TabsContent>
            </Tabs>
          </div>
          </div>
        )}



        {selectedNode.type === 'NODO' && (
          <div className="p-6 pt-4 overflow-y-auto h-full w-full">
          <NodoEditor 
            nodeData={nodeData} 
            handleChange={handleChange} 
            handleDelete={() => setIsDeleteDialogOpen(true)}
            tc={tc}
            etiquetas={etiquetas}
            proyecto={proyecto}
          />
          </div>
        )}

        {selectedNode.type === 'RECURSO' && (
          <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0 w-full">
            <div className="px-6 pt-4 shrink-0">
              <TabsList variant="line" className="mb-4 shrink-0">
                <TabsTrigger value="general">
                  <Settings2 className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                {nodeData.categoria === 'RECURSO_HUMANO' && (
                  <TabsTrigger value="bonos">
                    <Gift className="w-4 h-4 mr-2" />
                    Bonos {(nodeData.bonos?.length || 0) > 0 && nodeData.bonos.length}
                  </TabsTrigger>
                )}
                <TabsTrigger value="combo">
                  <Layers className="w-4 h-4 mr-2" />
                  Combo
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="general" className="flex-1 overflow-y-auto px-6 pb-6 outline-none m-0">
              <div className="space-y-2 max-w-[460px]">
            {/* 1era fila solo Codigo y Descripcion */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 flex flex-col gap-1.5">
                <Label>Código</Label>
                <Input type="text" className="bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-sm h-8 py-1" value={nodeData.itemServicio?.codigo || nodeData.itemId || 'N/A'} readOnly title="Código ERP" />
              </div>
              <div className="col-span-8 flex flex-col gap-1.5">
                <Label>Descripción</Label>
                <Input type="text" className="bg-slate-100 text-slate-500 cursor-not-allowed uppercase text-sm h-8 py-1" value={nodeData.nombre} readOnly title="No editable directamente" />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-3 min-h-[24px]">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                  CONFIGURACION
                </h3>
                <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
              </div>
              
              {nodeData.categoria === 'RECURSO_HUMANO' ? (
                // RRHH layout (Turnos, etc)
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4 flex flex-col gap-1.5">
                    <Label>Cant. Turnos</Label>
                    <NumericInput 
                      value={nodeData.cantidad}
                      isInteger={true}
                      onChange={(val) => handleChange('cantidad', val || 1)} 
                      min="1"
                      disabled={proyecto?.estado !== 'BORRADOR'}
                    />
                  </div>
                  <div className="col-span-8 flex flex-col gap-1.5">
                    <Label>Turno</Label>
                    {proyecto?.estado === 'BORRADOR' ? (
                      <SearchableSelect
                        id="field-turno"
                        options={turnos.map(t => ({ value: String(t.codigo), label: t.descripcion })).sort((a, b) => a.label.localeCompare(b.label))}
                        value={nodeData.turnoCodigo !== undefined ? String(nodeData.turnoCodigo) : ''}
                        onChange={(val) => {
                          const code = parseInt(val, 10);
                          const t = turnos.find(x => x.codigo === code);
                          handleChange({
                            turnoCodigo: code,
                            personas: t?.personas || 1,
                            horasSemana: t ? ((t.lunes === 1 ? t.lunesHoras : 0) + (t.martes === 1 ? t.martesHoras : 0) + (t.miercoles === 1 ? t.miercolesHoras : 0) + (t.jueves === 1 ? t.juevesHoras : 0) + (t.viernes === 1 ? t.viernesHoras : 0) + (t.sabado === 1 ? t.sabadoHoras : 0) + (t.domingo === 1 ? t.domingoHoras : 0)) : 0
                          });
                        }}
                        placeholder="Seleccione..."
                      />
                    ) : (
                      <Input value={turnos.find(t => t.codigo === nodeData.turnoCodigo)?.descripcion || `Cód: ${nodeData.turnoCodigo}`} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm uppercase h-8 py-1 px-2.5" />
                    )}
                  </div>
                </div>

                {nodeData.turnoCodigo && turnos.find(t => t.codigo === nodeData.turnoCodigo) && (
                  <TurnoCard turno={turnos.find(t => t.codigo === nodeData.turnoCodigo)!} cantidadTurnos={nodeData.cantidad || 1} />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <Label>Cubre Descanso</Label>
                    {proyecto?.estado === 'BORRADOR' ? (
                      <SearchableSelect
                        id="field-cubreDescanso"
                        options={OPCIONES_CUBRE_DESCANSO.map(o => ({ value: o.value, label: o.label }))}
                        value={String(nodeData.cubreDescanso || 0)}
                        onChange={(val) => handleChange('cubreDescanso', parseInt(val, 10))}
                        searchable={false}
                      />
                    ) : (
                      <Input value={
                        nodeData.cubreDescanso === 1 ? '1 - Descansero' :
                        nodeData.cubreDescanso === 2 ? '2 - Extrero' :
                        nodeData.cubreDescanso === 3 ? '3 - Bono Descanso' : '0 - No Aplica'
                      } readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm h-8 py-1 px-2.5" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Estándar layout (Cantidad, Unidad Medida)
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Cantidad</Label>
                  <NumericInput 
                    value={nodeData.cantidad}
                    isInteger={true}
                    onChange={(val) => handleChange('cantidad', val || 1)} 
                    min="1"
                    disabled={proyecto?.estado !== 'BORRADOR'}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Unidad Medida</Label>
                  <Input value={nodeData.itemServicio?.unidad_medida || 'UNIDAD'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed uppercase text-sm h-8 py-1" />
                </div>
              </div>
            )}
            </div>
            </div>

            {/* ── TABLA TIPOS COMBO (nueva arquitectura) ──────────────────────────
                Visible para cualquier ítem primario (no combo) que tenga Tipos Combo */}
            {!nodeData.esCombo && currentItemCatalogo?.tiposCombo && currentItemCatalogo.tiposCombo.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center mb-3 min-h-[24px]">
                  <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-l-2 border-indigo-500 pl-2 leading-none">
                    ITEMS ADICIONALES
                  </h3>
                  <div className="flex-1 border-t border-indigo-200 ml-3 mt-0.5" />
                </div>
                <div className="border rounded-md">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                       <tr>
                         <th className="px-3 py-2 w-2/5">Item Adicional</th>
                         <th className="px-3 py-2">Ítem</th>
                         <th className="px-3 py-2 w-20 text-center">Incluido</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {currentItemCatalogo.tiposCombo.map(asoc => {
                         const nombreTipo = tiposCombosNombres[asoc.tipoComboId] || `Tipo ${asoc.tipoComboId}`;
                         const opcionesCombo = (itemsPorTipoCombo[asoc.tipoComboId] ?? [])
                           .map(i => ({ value: String(i.id), label: i.descripcion }));

                         const getNodoRecursos = (): RecursoCosteo[] => {
                           if (!parentId) return proyecto!.recursos;
                           const findN = (nodos: NodoCosteo[], id: string): NodoCosteo | null => {
                             for (const n of nodos) {
                               if (n.id === id) return n;
                               const f = findN(n.nodos, id);
                               if (f) return f;
                             }
                             return null;
                           };
                           return findN(proyecto!.nodos, parentId)?.recursos ?? [];
                         };
                         const nodoRecursos = getNodoRecursos();
                         const hijoActual = nodoRecursos.find(
                           r => r.esCombo && r.comboParentId === selectedNode.id &&
                                opcionesCombo.some(o => parseInt(o.value, 10) === r.itemId)
                         );
                         const currentVal = hijoActual ? String(hijoActual.itemId) : '';

                         // obligatorio=1 → siempre incluido (no editable)
                         // obligatorio=0 → controlado por usuario; si no hay elección, derivado de si ya existe hijo
                         const estaIncluido = asoc.obligatorio
                           ? true
                           : (combosOptIncluidos[asoc.tipoComboId] ?? !!hijoActual);

                         return (
                           <tr key={asoc.tipoComboId} className="bg-white">
                             <td className="px-3 py-2 font-medium text-slate-700">{nombreTipo}</td>

                             {/* Columna Ítem */}
                             <td className="px-3 py-2">
                               {proyecto?.estado === 'BORRADOR' ? (
                                 <SearchableSelect
                                   options={[
                                     { value: '', label: '— Sin seleccionar —' },
                                     ...opcionesCombo,
                                   ]}
                                   value={currentVal}
                                   disabled={!estaIncluido}
                                   onChange={(val) => {
                                     const factorCosto = nodeData.categoria === 'RECURSO_HUMANO'
                                       ? (nodeData.cantidad ?? 1) * (nodeData.personas ?? 1)
                                       : (nodeData.cantidad ?? 1);
                                     if (hijoActual) {
                                       dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: hijoActual.id } });
                                     }
                                     if (val) {
                                       const newItemId = parseInt(val, 10);
                                       const newItem = catalogoItems.find(i => i.id === newItemId);
                                       if (newItem) {
                                         const newRecursoId = `REC-${Date.now()}-TC${asoc.tipoComboId}`;
                                         let cat: RecursoCosteo['categoria'] = 'ARTICULO';
                                         if (newItem.tipoItem === 4) cat = 'EQUIPO';
                                         if (newItem.tipoItem === 3)
                                           cat = newItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
                                         dispatch({
                                           type: 'ADD_RECURSO',
                                           payload: {
                                             nodoId: parentId,
                                             recurso: {
                                               id: newRecursoId,
                                               itemId: newItem.id,
                                               nombre: newItem.descripcion,
                                               categoria: cat,
                                               tipoCosto: 'MENSUAL',
                                               cantidad: factorCosto,
                                               costoUnitario: 0,
                                               precioVentaUnitario: 0,
                                               precioVentaOrigen: 'MANUAL',
                                               esCombo: true,
                                               comboParentId: selectedNode.id,
                                               recetas: [],
                                             },
                                           },
                                         });
                                         for (const sub of newItem.combosPrincipal ?? []) {
                                           if (!sub.nuevoIncluido || Number(sub.nuevoCantidad) <= 0) continue;
                                           const secItem = catalogoItems.find(i => i.id === sub.productoSecundarioId);
                                           if (!secItem) continue;
                                           let secCat: RecursoCosteo['categoria'] = 'SERVICIO';
                                           if (secItem.tipoItem === 1 || secItem.tipoItem === 2) secCat = 'ARTICULO';
                                           if (secItem.tipoItem === 4) secCat = 'EQUIPO';
                                           if (secItem.tipoItem === 3)
                                             secCat = secItem.tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
                                           dispatch({
                                             type: 'ADD_RECURSO',
                                             payload: {
                                               nodoId: parentId,
                                               recurso: {
                                                 id: `REC-${Date.now()}-TC${asoc.tipoComboId}C${sub.productoSecundarioId}`,
                                                 itemId: secItem.id,
                                                 nombre: secItem.descripcion,
                                                 categoria: secCat,
                                                 tipoCosto: 'MENSUAL',
                                                 cantidad: Math.max(1, Math.round(Number(sub.nuevoCantidad) * factorCosto)),
                                                 costoUnitario: 0,
                                                 precioVentaUnitario: 0,
                                                 precioVentaOrigen: 'MANUAL',
                                                 esCombo: true,
                                                 comboParentId: newRecursoId,
                                                 recetas: [],
                                               },
                                             },
                                           });
                                         }
                                       }
                                     }
                                   }}
                                 />
                               ) : (
                                 <Input
                                   value={opcionesCombo.find(o => o.value === currentVal)?.label || currentVal || '—'}
                                   readOnly
                                   className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm uppercase h-8 py-1 px-2.5"
                                 />
                               )}
                             </td>

                             {/* Columna Incluido — última */}
                             <td className="px-3 py-2 text-center">
                               <input
                                 type="checkbox"
                                 checked={estaIncluido}
                                 disabled={!!asoc.obligatorio || proyecto?.estado !== 'BORRADOR'}
                                 onChange={(e) => {
                                   setCombosOptIncluidos(prev => ({ ...prev, [asoc.tipoComboId]: e.target.checked }));
                                   if (!e.target.checked && hijoActual) {
                                     dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: hijoActual.id } });
                                   }
                                 }}
                                 className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                               />
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}

            <div className="pt-4">
              <div className="flex items-center mb-3 min-h-[24px]">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                  FINANCIERO
                </h3>
                <div className="flex-1 border-t border-blue-200 ml-3 mt-0.5"></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {!nodeData.esCombo && (
                <>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Precio Venta ({proyecto?.moneda || 'Q'})</Label>
                  <NumericInput 
                    value={nodeData.precioVentaUnitario}
                    onChange={(val) => handleChange('precioVentaUnitario', val || 0)} 
                    min="0"
                    disabled={proyecto?.estado !== 'BORRADOR'}
                  />
                  {nodeData.categoria === 'RECURSO_HUMANO' && (
                    <p className="text-xs text-slate-500 italic">* Por Persona</p>
                  )}
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>SubTotal Venta</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (nodeData.precioVentaUnitario || 0));
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1 w-full rounded-sm border border-slate-200 outline-none" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Total Venta</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (nodeData.precioVentaUnitario || 0));
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-blue-50/50 text-blue-700 font-bold border-blue-200 text-sm px-2.5 h-8 py-1 w-full rounded-sm border outline-none" 
                  />
                </div>
                </>
                )}
              </div>


              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Costo Un. ({proyecto?.moneda || 'Q'})</Label>
                  <Input 
                    value={(nodeData.costoUnitario || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>SubTotal Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * (nodeData.costoUnitario || 0));
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Bonos Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const bonosTotal = (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.costoUnitario || 0), 0);
                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(factor * bonosTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-slate-100 text-slate-500 cursor-not-allowed text-sm px-2.5 h-8 py-1" 
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>Total Costo</Label>
                  <Input 
                    value={(() => {
                      const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                      const subtotal = factor * (nodeData.costoUnitario || 0);
                      const bonosTotal = factor * (nodeData.bonos || []).reduce((sum: number, b: any) => sum + (b.costoUnitario || 0), 0);

                      // Sumar costo de todos los sub-ítems del combo (originales y manuales)
                      let siblingsArr: RecursoCosteo[] = parentId
                        ? (() => {
                            const findN = (ns: NodoCosteo[], id: string): NodoCosteo | null => {
                              for (const n of ns) { if (n.id === id) return n; const f = findN(n.nodos, id); if (f) return f; }
                              return null;
                            };
                            return findN(proyecto.nodos, parentId)?.recursos ?? [];
                          })()
                        : proyecto.recursos;
                      const comboHijos = siblingsArr.filter(h => h.esCombo && h.comboParentId === nodeData.id);
                      const comboTotal = comboHijos.reduce((sum, h) => {
                        const hf = h.categoria === 'RECURSO_HUMANO' ? ((h.cantidad || 1) * (h.personas || 1)) : (h.cantidad || 1);
                        return sum + (h.costoUnitario || 0) * hf;
                      }, 0);

                      return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(subtotal + bonosTotal + comboTotal);
                    })()} 
                    readOnly tabIndex={-1} 
                    className="bg-red-50/50 text-red-600 font-bold border-red-200 text-sm px-2.5 h-8 py-1" 
                  />
                </div>
              </div>
            </div>

            {/* ── FUENTE COSTO ─────────────────────────────────────────────────
                Visible para cualquier recurso que tenga itemId definido         */}
            {nodeData.itemId > 0 && (
              <FuenteCostoPanel
                itemId={nodeData.itemId}
                costeoId={parseInt(proyecto.id, 10)}
                costoActual={nodeData.costoUnitario ?? 0}
              />
            )}

            <div className="space-y-2 max-w-[460px] mt-4">
            {nodeData.recetas && nodeData.recetas.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Recetas Asociadas</h3>
                {nodeData.recetas.map((receta: any) => (
                  <div key={receta.id} className="border rounded-md mb-4 bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-100 p-2 font-medium border-b text-sm">
                      {receta.nombre}
                    </div>
                    <div className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Item</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Cant. Base</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Costo Un.</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Costo Tot.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receta.items.map((item: any) => (
                            <tr key={item.id} className="border-t">
                              <td className="py-2 px-3">{item.nombre}</td>
                              <td className="py-2 px-3 text-right">{item.cantidad}</td>
                              <td className="py-2 px-3 text-right text-slate-600">{item.costoUnitario.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-red-600 font-medium">{(item.cantidad * item.costoUnitario * nodeData.cantidad).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </TabsContent>

          {nodeData.categoria === 'RECURSO_HUMANO' && (
            <TabsContent value="bonos" className="flex-1 overflow-y-auto px-6 pb-6 outline-none m-0">
              <div className="space-y-4 pt-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label>Seleccionar Bono</Label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Seleccione...' },
                        ...bonosDisponibles
                          .slice()
                          .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
                          .map(b => ({ value: b.codigo, label: b.descripcion }))
                      ]}
                      value={selectedBonoId}
                      onChange={(val) => setSelectedBonoId(val)}
                      placeholder="Seleccione..."
                      searchable={false}
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => {
                      if (!selectedBonoId) return;
                      const bono = bonosDisponibles.find(b => b.codigo === selectedBonoId);
                      if (bono) {
                        const newBonos = [...(nodeData.bonos || []), {
                          id: crypto.randomUUID(),
                          erpBonoId: bono.codigo,
                          nombre: bono.descripcion,
                          costoUnitario: bono.costo,
                        }];
                        handleChange('bonos', newBonos);
                        setSelectedBonoId('');
                      }
                    }}
                    disabled={!selectedBonoId || proyecto?.estado !== 'BORRADOR'}
                  >
                    Agregar
                  </Button>
                </div>
                
                {(nodeData.bonos || []).length > 0 ? (
                  <div className="border rounded-md overflow-hidden bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Bono</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Costo Un.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 bg-slate-100">SubTotal Costo</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(nodeData.bonos || []).map((b: any, idx: number) => {
                          const factor = nodeData.categoria === 'RECURSO_HUMANO' ? ((nodeData.cantidad || 1) * (nodeData.personas || 1)) : (nodeData.cantidad || 1);
                          const costoTotal = (b.costoUnitario || 0) * factor;
                          return (
                            <tr key={idx} className="bg-white hover:bg-slate-50">
                              <td className="px-3 py-2">{b.nombre}</td>
                              <td className="px-3 py-2 text-right text-slate-500">{b.costoUnitario.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-right text-slate-700 font-semibold bg-slate-100">{costoTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                              <td className="px-3 py-2 text-center">
                                <button 
                                  type="button" 
                                  className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50" 
                                  disabled={proyecto?.estado !== 'BORRADOR'}
                                  onClick={() => {
                                    const newBonos = (nodeData.bonos || []).filter((_: any, i: number) => i !== idx);
                                    handleChange('bonos', newBonos);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border border-dashed rounded-md bg-slate-50">
                    No hay bonos agregados
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ── Pestaña COMBO ─────────────────────────────────── */}
          {(() => {
            const combosEfectivos = nodeData.combosDisponibles ?? combosComputados ?? [];

            // Obtener recursos hermanos del mismo nodo para detectar cuáles combos ya están en el árbol
            let hermanos: RecursoCosteo[] = [];
            if (!parentId) {
              hermanos = proyecto.recursos;
            } else {
              const findNodoById = (nodos: NodoCosteo[], id: string): NodoCosteo | null => {
                for (const n of nodos) {
                  if (n.id === id) return n;
                  const f = findNodoById(n.nodos, id);
                  if (f) return f;
                }
                return null;
              };
              const nodoPadre = findNodoById(proyecto.nodos, parentId);
              hermanos = nodoPadre?.recursos ?? [];
            }
            return (
              <TabsContent value="combo" className="flex-1 overflow-visible px-6 pb-6 outline-none m-0">
                <ComboTab
                  recurso={{ ...nodeData, combosDisponibles: combosEfectivos }}
                  parentId={parentId}
                  esBorrador={proyecto?.estado === 'BORRADOR'}
                  hermanos={hermanos}
                  catalogoItems={catalogoItems}
                />
              </TabsContent>
            );
          })()}
        </Tabs>

        )}

      </div>
      
      {selectedNode.type !== 'PROYECTO' && (
        <div className="flex flex-row items-center justify-between px-6 py-4 border-t bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
          {!(selectedNode.type === 'NODO' && nodeData?.nivel === 1) && !nodeData?.esCombo && (
              <Button 
                variant="outline"
                onClick={() => setIsMoveModalOpen(true)}
                className="text-slate-700"
              >
                <CornerUpRight className="w-4 h-4 mr-2" />
                Mover
              </Button>
            )}
            <Button 
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onConfirm={confirmDelete} 
        nodeName={nodeData.nombre || 'Sin nombre'} 
        nodeType={
          selectedNode.type === 'NODO' ? (etiquetas[nodeData.nivel - 1] || 'Nodo') : lblR
        }
      />

      <MoveNodeDialog
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        itemToMove={nodeData && selectedNode.type !== 'PROYECTO' ? { id: selectedNode.id, type: selectedNode.type as 'NODO' | 'RECURSO', nivel: nodeData.nivel || 999, nombre: nodeData.nombre } : null}
      />
    </div>
  );
}

function NodoEditor({ nodeData, handleChange, handleDelete, tc, etiquetas, proyecto }: { nodeData: NodoCosteo, handleChange: (field: string | Record<string, any>, value?: any) => void, handleDelete: () => void, tc: any, etiquetas: string[], proyecto: any }) {
  const [departamentos, setDepartamentos] = useState<import('@/lib/erp').ErpDepartamento[]>([]);
  const [municipios, setMunicipios] = useState<import('@/lib/erp').ErpMunicipio[]>([]);;
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [direccionesOperativas, setDireccionesOperativas] = useState<ErpDireccionOperativa[]>([]);

  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [showAddressLookup, setShowAddressLookup] = useState<boolean>(false);
  
  const hasDireccion = tc?.nivelConDireccion === nodeData.nivel;
  const nombreEtiqueta = etiquetas[nodeData.nivel - 1] || `Nivel ${nodeData.nivel}`;
  
  // Si no tiene secuencia pero ya tiene texto, asumimos que está en modo "Nueva" (fue editada). Si está vacío, por defecto mostrar el selector.
  const [isNewAddress, setIsNewAddress] = useState<boolean>(!nodeData.direccionSecuencia && !!nodeData.direccion);

  useEffect(() => {
    let active = true;
    if (hasDireccion && proyecto?.empresaId && proyecto?.cliente?.id) {
      setLoadingDirecciones(true);
      const clienteErpId = parseInt(proyecto.cliente.codigo || proyecto.cliente.id, 10);
      getClienteDireccionesERP(proyecto.empresaId, clienteErpId).then(dirs => {
        if (active) {
          setDireccionesOperativas(dirs);
          setLoadingDirecciones(false);
        }
      });
    }
    return () => { active = false; };
  }, [hasDireccion, proyecto?.empresaId, proyecto?.cliente?.id]);

  const isDireccionEnUso = (secuencia: number) => {
    let inUse = false;
    const walk = (nodos: NodoCosteo[]) => {
      for (const n of nodos) {
        if (n.id !== nodeData.id && n.direccionSecuencia === secuencia) {
          inUse = true;
        }
        walk(n.nodos);
      }
    };
    walk(proyecto.nodos);
    return inUse;
  };

  const handleSelectDireccion = (secuenciaStr: string) => {
    if (secuenciaStr === 'NEW') {
      setIsNewAddress(true);
      handleChange({
        direccionSecuencia: undefined,
        direccion: '',
        pais: 'GT',
        departamento: '',
        municipio: ''
      });
      return;
    }
    
    const secuencia = parseInt(secuenciaStr, 10);
    if (isDireccionEnUso(secuencia)) {
      alert('Esta dirección ya está en uso en otro nivel del costeo.');
      return;
    }
    
    const dir = direccionesOperativas.find(d => d.secuencia === secuencia);
    if (dir) {
      setIsNewAddress(false);
      handleChange({
        nombre: dir.nombre,
        direccionSecuencia: dir.secuencia,
        direccion: dir.direccion,
        pais: dir.pais || 'GT',
        departamento: dir.departamento,
        municipio: dir.municipio
      });
    }
  };

  useEffect(() => {
    let active = true;
    if (hasDireccion) {
      const fetchDeptos = async () => {
        setLoadingDeptos(true);
        const data = await getDepartamentosERP();
        if (active) {
          setDepartamentos(data);
          setLoadingDeptos(false);
          if (!nodeData.departamento && data.length > 0) {
            handleChange('departamento', data[0].codigo);
          }
        }
      };
      fetchDeptos();
      
      if (nodeData.pais !== 'GT') {
        handleChange('pais', 'GT');
      }
    } else {
      setLoadingDeptos(false);
    }
    return () => { active = false; };
  }, [hasDireccion]);

  useEffect(() => {
    let active = true;
    if (!hasDireccion || !nodeData.departamento) {
      setMunicipios([]);
      return;
    }
    
    const fetchMunis = async () => {
      setLoadingMunis(true);
      const data = await getMunicipiosERP(Number(nodeData.departamento!));
      if (active) {
        setMunicipios(data);
        setLoadingMunis(false);
        const muniExists = data.find(m => {
          const code1 = String(m.codigo).trim();
          const code2 = String(nodeData.municipio || '').trim();
          if (code1 === code2) return true;
          const num1 = parseInt(code1, 10);
          const num2 = parseInt(code2, 10);
          return !isNaN(num1) && !isNaN(num2) && num1 === num2;
        });
        
        if (!muniExists && data.length > 0) {
          handleChange('municipio', String(data[0].codigo));
        }
      }
    };
    fetchMunis();
    
    return () => { active = false; };
  }, [nodeData.departamento, hasDireccion]);

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="general" className="w-full">
        <TabsList variant="line" className="mb-4 shrink-0">
          <TabsTrigger value="general">
            <Settings2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="resumen">
            <Calculator className="w-4 h-4 mr-2" />
            Resumen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-3 outline-none min-h-[250px]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nombre</Label>
              <Input 
                className="uppercase"
                value={nodeData.nombre || ''} 
                onChange={(e) => handleChange('nombre', normalizeText(e.target.value))} 
                maxLength={hasDireccion ? 20 : undefined}
                readOnly={hasDireccion && !isNewAddress}
                title={hasDireccion && !isNewAddress ? "El nombre proviene de la dirección operativa seleccionada" : undefined}
              />

            </div>
            
              {hasDireccion && (
                <div className="pt-4 border-t mt-4 col-span-2">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-l-2 border-blue-500 pl-2 leading-none">
                      Direccion
                    </h3>
                    <div className="flex-1 border-t border-blue-200 mx-3 mt-0.5"></div>
                    {!isNewAddress ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleSelectDireccion('NEW')} className="text-blue-600 h-6 text-xs px-2">
                        + Crear Nueva
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewAddress(false)} className="text-blue-600 h-6 text-xs px-2">
                        <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar Existente
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {!isNewAddress && (
                      <div className="space-y-1.5 col-span-2">
                        <Label>Seleccionar Dirección</Label>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedAddr = direccionesOperativas.find(d => d.secuencia === nodeData.direccionSecuencia);
                            return (
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full justify-start text-left font-normal" 
                                disabled={loadingDirecciones}
                                onClick={() => setShowAddressLookup(true)}
                              >
                                <Search className="mr-2 h-4 w-4" />
                                {loadingDirecciones ? "Cargando direcciones..." : selectedAddr ? selectedAddr.nombre : "Buscar dirección..."}
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 col-span-2">
                      <Label>Dirección</Label>
                      <Input 
                        className="uppercase"
                        value={nodeData.direccion || ''} 
                        onChange={(e) => handleChange('direccion', normalizeText(e.target.value))} 
                        readOnly={!isNewAddress}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <Label>País</Label>
                      <Input
                        value="GUATEMALA"
                        disabled
                        className="bg-slate-100 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>
                    Departamento {loadingDeptos && <span className="text-xs text-slate-400">(cargando...)</span>}
                  </Label>
                  <SearchableSelect
                    options={departamentos.map(d => ({ value: String(d.codigo), label: d.nombre })).sort((a, b) => a.label.localeCompare(b.label))}
                    value={nodeData.departamento || ''}
                    onChange={(val) => handleChange('departamento', val)}
                    disabled={loadingDeptos || !isNewAddress}
                    placeholder="Seleccione un departamento"
                    error={!nodeData.departamento}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>
                    Municipio {loadingMunis && <span className="text-xs text-slate-400">(cargando...)</span>}
                  </Label>
                  <SearchableSelect
                    options={municipios.map(m => ({ value: String(m.codigo), label: m.nombre })).sort((a, b) => a.label.localeCompare(b.label))}
                    value={String(nodeData.municipio || '')}
                    onChange={(val) => handleChange('municipio', val)}
                    disabled={loadingMunis || !isNewAddress || !nodeData.departamento}
                    placeholder="Seleccione un municipio"
                  />
                </div>
              </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="resumen" className="outline-none">
          {(() => {
            const allRecursos: any[] = [];
            const walk = (nodos: NodoCosteo[], path: string[]) => {
              for (const n of nodos) {
                const newPath = [...path, n.nombre];
                n.recursos.forEach(r => allRecursos.push({ ...r, _path: newPath }));
                walk(n.nodos, newPath);
              }
            };
            nodeData.recursos.forEach(r => allRecursos.push({ ...r, _path: [nodeData.nombre] }));
            walk(nodeData.nodos, [nodeData.nombre]);
            return <RecursosSummaryTable recursos={allRecursos} />;
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
