import React, { useState, useEffect, useMemo } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { getTurnosERP } from '@/app/actions/erp';
import type { ErpTurno } from '@/lib/erp';
import { RecursoCosteo } from '@/lib/types/costeos';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  ExpandedState
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { BuscadorTabla, claseFilaTabla, incluyeTexto } from './tabla-listado';
import { listarItems } from '@/app/actions/items';
import { listarCategoriasPorEmpresa } from '@/app/actions/categorias';
import type { ItemRow } from '@/lib/types/items';
import { listarTiposComboRHPorEmpresa } from '@/app/actions/tipos-combo-rh';
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh';

const OPCIONES_CUBRE_DESCANSO = [
  { value: 0, label: '0 - No Aplica' },
  { value: 1, label: '1 - Descansero' },
  { value: 2, label: '2 - Extrero' },
  { value: 3, label: '3 - Bono Descanso' }
];

interface RecursoSummaryItem extends RecursoCosteo {
  _path?: string[];
}

interface HierarchicalData {
  id: string;
  nombre: string;
  categoria: string;
  cantidadTotal: number;
  turnoDesc: string;
  combosRHDesc: Record<number, string>; // tipoComboRHId -> description string
  /** @deprecated kept only for backward compat display — prefer combosRHDesc */
  uniformeDesc?: string;
  descansoDesc: string;
  personasCalculadas: number | string;
  ventaAcumulada: number;
  costoAcumulado: number;
  margenAcumulado: number;
  esCategoria?: boolean;
  subRows?: HierarchicalData[];
  profundidad?: number;
  tieneHijos?: boolean;
  abierto?: boolean;
}

function idsConHijos(rows: HierarchicalData[]): string[] {
  const ids: string[] = [];
  const walk = (list: HierarchicalData[]) => {
    for (const row of list) {
      if (row.subRows?.length) {
        ids.push(row.id);
        walk(row.subRows);
      }
    }
  };
  walk(rows);
  return ids;
}

export function RecursosSummaryTable({ recursos, porCategoria = false }: { recursos: RecursoSummaryItem[]; porCategoria?: boolean }) {
  const { proyecto } = useCosteo();
  const [turnos, setTurnos] = useState<ErpTurno[]>([]);
  const [uniformesItems, setUniformesItems] = useState<ItemRow[]>([]);
  const [catalogoItems, setCatalogoItems] = useState<ItemRow[]>([]);
  const [categoriasCat, setCategoriasCat] = useState<{ id: number; nombre: string; prioridad: number }[]>([]);
  const [tiposComboRH, setTiposComboRH] = useState<TipoComboRHRow[]>([]);
  const [catalogoListo, setCatalogoListo] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let active = true;
    if (!proyecto?.empresaId) {
      setCatalogoListo(true);
      return;
    }
    setCatalogoListo(false);
    const fetchData = async () => {
      const [tData, itemsData, tiposData, categoriasData] = await Promise.all([
        getTurnosERP(proyecto.empresaId),
        listarItems(),
        listarTiposComboRHPorEmpresa(proyecto.empresaId),
        listarCategoriasPorEmpresa(proyecto.empresaId),
      ]);
      if (active) {
        setTurnos(tData);
        setCatalogoItems(itemsData);
        // Filtrar items de la empresa con bandera uniforme=1
        setUniformesItems(itemsData.filter(i => i.empresaId === proyecto.empresaId && i.uniforme === 1));
        setCategoriasCat(categoriasData.map(c => ({ id: c.id, nombre: c.nombre, prioridad: c.prioridad })));
        setTiposComboRH(tiposData);
        setCatalogoListo(true);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [proyecto?.empresaId]);

  const firmaRecursos = (recursos || []).map(r => r.id).join('|');
  useEffect(() => {
    setCerrados(new Set());
  }, [firmaRecursos]);

  // Agrupar recursos jerárquicamente
  const data = useMemo(() => {
    const padres: Record<string, HierarchicalData> = {};

    (recursos || []).forEach((r) => {
      const baseFactor = r.categoria === 'RECURSO_HUMANO' ? ((r.cantidad || 1) * (r.personas || 1)) : (r.cantidad || 1);
      let costo = (r.costoUnitario || 0) * baseFactor;
      let venta = (r.precioVentaUnitario || 0) * baseFactor;

      if (r.bonos && r.bonos.length > 0) {
        costo += r.bonos.reduce((sum: number, b: any) => sum + (Number(b.costoUnitario) || 0), 0) * baseFactor;
      }

      const calcReceta = (receta: any, pCant: number) => {
        receta.items?.forEach((item: any) => {
          const qty = item.cantidad * pCant;
          costo += item.costoUnitario * qty;
          if (item.subRecetas) item.subRecetas.forEach((sr: any) => calcReceta(sr, qty));
        });
      };
      if (r.recetas) r.recetas.forEach((receta: any) => calcReceta(receta, r.cantidad || 1));

      const parentId = (r.itemId || r.id || 'UNKNOWN').toString();
      
      if (!padres[parentId]) {
        padres[parentId] = {
          id: parentId,
          nombre: r.nombre || 'Desconocido',
          categoria: r.categoria || '',
          cantidadTotal: 0,
          turnoDesc: '',
          combosRHDesc: {},
          descansoDesc: '',
          personasCalculadas: 0,
          ventaAcumulada: 0,
          costoAcumulado: 0,
          margenAcumulado: 0,
          subRows: []
        };
      }

      // Build childKey using combosRhSeleccionados (falls back to uniformeCodigo for legacy)
      const comboRHKey = Object.entries(r.combosRhSeleccionados ?? {}).sort().map(([k, v]) => `${k}:${v}`).join('|') || r.uniformeCodigo || 'NA';
      const childKey = `${parentId}-${r.turnoCodigo || 'NA'}-${comboRHKey}-${r.cubreDescanso || 0}-${r.personas || 1}`;
      let child = padres[parentId].subRows!.find(c => c.id === childKey);
      
      if (!child) {
        const tDesc = turnos.find(t => t.codigo === r.turnoCodigo)?.descripcion || '-';
        const dFull = OPCIONES_CUBRE_DESCANSO.find(o => o.value === (r.cubreDescanso || 0))?.label || '-';

        // Compute combosRHDesc: one entry per TipoComboRH tipo
        const combosRHDesc: Record<number, string> = {};
        for (const tipo of tiposComboRH) {
          const itemIdStr = r.combosRhSeleccionados?.[String(tipo.id)] || '';
          // Legacy compat: if tipo.nombre === 'UNIFORME' and no combosRhSeleccionados, use uniformeCodigo
          const effectiveItemIdStr = itemIdStr || (tipo.nombre === 'UNIFORME' ? (r.uniformeCodigo || '') : '');
          const itemId = parseInt(effectiveItemIdStr, 10);
          combosRHDesc[tipo.id] = !isNaN(itemId)
            ? (uniformesItems.find(u => u.id === itemId)?.descripcion || effectiveItemIdStr || '-')
            : '-';
        }
        
        child = {
          id: childKey,
          nombre: '', // Empty for children, as it will be grouped under parent
          categoria: r.categoria || '',
          cantidadTotal: 0,
          turnoDesc: tDesc,
          combosRHDesc,
          descansoDesc: dFull.includes(' - ') ? dFull.split(' - ')[1] : dFull,
          personasCalculadas: 0,
          ventaAcumulada: 0,
          costoAcumulado: 0,
          margenAcumulado: 0,
        };
        padres[parentId].subRows!.push(child);
      }

      // Add to parent
      padres[parentId].cantidadTotal += r.cantidad || 1;
      padres[parentId].ventaAcumulada += venta;
      padres[parentId].costoAcumulado += costo;
      padres[parentId].margenAcumulado += (venta - costo);
      if (r.categoria === 'RECURSO_HUMANO') {
        (padres[parentId].personasCalculadas as number) += baseFactor;
      }

      // Add to child
      child.cantidadTotal += r.cantidad || 1;
      child.ventaAcumulada += venta;
      child.costoAcumulado += costo;
      child.margenAcumulado += (venta - costo);
      if (r.categoria === 'RECURSO_HUMANO') {
        (child.personasCalculadas as number) += baseFactor;
      }
    });

    // Cleanup formatting for parent vs child
    return Object.values(padres).map(p => {
      // If a parent only has 1 subrow variation, no need to make it expandable, just merge them
      if (p.subRows && p.subRows.length === 1) {
        const child = p.subRows[0];
        return {
          ...p,
          turnoDesc: child.turnoDesc,
          combosRHDesc: child.combosRHDesc,
          descansoDesc: child.descansoDesc,
          subRows: undefined // Remove subrows so it's a flat row
        };
      } else {
        p.turnoDesc = 'Variados';
        for (const tipo of tiposComboRH) { p.combosRHDesc[tipo.id] = 'Variados'; }
        p.descansoDesc = 'Variados';
        return p;
      }
    });
  }, [recursos, turnos, uniformesItems, tiposComboRH]);

  const dataBase = useMemo(() => {
    if (!porCategoria) return data;
    if (!catalogoListo) return [];

    const montosDe = (r: RecursoSummaryItem) => {
      const baseFactor = r.categoria === 'RECURSO_HUMANO' ? ((r.cantidad || 1) * (r.personas || 1)) : (r.cantidad || 1);
      let costo = (r.costoUnitario || 0) * baseFactor;
      let venta = (r.precioVentaUnitario || 0) * baseFactor;
      if (r.bonos && r.bonos.length > 0) {
        costo += r.bonos.reduce((sum: number, b: { costoUnitario: number }) => sum + (Number(b.costoUnitario) || 0), 0) * baseFactor;
      }
      const calcReceta = (receta: { items?: Array<{ cantidad: number; costoUnitario: number; subRecetas?: unknown[] }> }, pCant: number) => {
        receta.items?.forEach((item) => {
          const qty = item.cantidad * pCant;
          costo += item.costoUnitario * qty;
          item.subRecetas?.forEach((sr) => calcReceta(sr as typeof receta, qty));
        });
      };
      r.recetas?.forEach((receta) => calcReceta(receta, r.cantidad || 1));
      return {
        cantidad: r.cantidad || 1,
        personas: r.categoria === 'RECURSO_HUMANO' ? baseFactor : 0,
        venta,
        costo,
        margen: venta - costo,
      };
    };

    const porId = new Map((recursos || []).map(r => [r.id, r]));

    const ordenCatalogo = (itemIds: number[]) => {
      const vistos = new Set<number>();
      const orden: number[] = [];
      for (const itemId of itemIds) {
        const combos = [...(catalogoItems.find(i => i.id === itemId)?.combosPrincipal ?? [])]
          .sort((a, b) => a.id - b.id);
        for (const combo of combos) {
          if (vistos.has(combo.productoSecundarioId)) continue;
          vistos.add(combo.productoSecundarioId);
          orden.push(combo.productoSecundarioId);
        }
      }
      return orden;
    };

    function filaCombo(matches: RecursoSummaryItem[], path: number[], permitidos: Set<string>, catId: number): HierarchicalData {
      const acc = { cantidad: 0, personas: 0, venta: 0, costo: 0, margen: 0 };
      for (const m of matches) {
        const montos = montosDe(m);
        acc.cantidad += montos.cantidad;
        acc.personas += montos.personas;
        acc.venta += montos.venta;
        acc.costo += montos.costo;
        acc.margen += montos.margen;
      }
      const subRows = ramasCombo(matches.map(m => m.id), [matches[0].itemId], path, permitidos, catId);
      const catalogo = catalogoItems.find(i => i.id === matches[0].itemId);
      return {
        id: `c${catId}-${path.join('.')}`,
        nombre: matches[0].nombre || catalogo?.descripcion || 'Desconocido',
        categoria: matches[0].categoria || '',
        cantidadTotal: acc.cantidad,
        turnoDesc: '',
        combosRHDesc: {},
        descansoDesc: '',
        personasCalculadas: acc.personas,
        ventaAcumulada: acc.venta,
        costoAcumulado: acc.costo,
        margenAcumulado: acc.margen,
        subRows: subRows.length > 0 ? subRows : undefined,
      };
    }

    function ramasCombo(parentIds: string[], principalItemIds: number[], path: number[], permitidos: Set<string>, catId: number): HierarchicalData[] {
      if (path.length > 12) return [];
      const padres = new Set(parentIds);
      const filas: HierarchicalData[] = [];
      const usados = new Set<number>();
      for (const itemId of ordenCatalogo(principalItemIds)) {
        if (path.includes(itemId)) continue;
        const matches = (recursos || []).filter(r => permitidos.has(r.id) && r.esCombo && r.itemId === itemId && !!r.comboParentId && padres.has(r.comboParentId));
        if (matches.length === 0) continue;
        usados.add(itemId);
        filas.push(filaCombo(matches, [...path, itemId], permitidos, catId));
      }
      const extras = new Map<number, RecursoSummaryItem[]>();
      for (const r of recursos || []) {
        if (!permitidos.has(r.id) || !r.esCombo || !r.comboParentId || !padres.has(r.comboParentId) || usados.has(r.itemId)) continue;
        if (path.includes(r.itemId)) continue;
        const lista = extras.get(r.itemId) ?? [];
        lista.push(r);
        extras.set(r.itemId, lista);
      }
      for (const [itemId, matches] of extras) {
        filas.push(filaCombo(matches, [...path, itemId], permitidos, catId));
      }
      return filas;
    }

    const catMap = new Map(categoriasCat.map(c => [c.id, c]));
    const grupos = new Map<number, { prioridad: number; fila: HierarchicalData; lineas: RecursoSummaryItem[] }>();
    for (const r of recursos || []) {
      const item = catalogoItems.find(i => i.id === r.itemId);
      const id = item?.categoriaId ?? 0;
      let grupo = grupos.get(id);
      if (!grupo) {
        const cat = catMap.get(id);
        grupo = {
          prioridad: cat && cat.prioridad > 0 ? cat.prioridad : 9999,
          lineas: [],
          fila: {
            id: `cat-${id}`,
            nombre: cat?.nombre ?? item?.categoria?.nombre ?? 'SIN CATEGORIA',
            categoria: '',
            esCategoria: true,
            cantidadTotal: 0,
            turnoDesc: '',
            combosRHDesc: {},
            descansoDesc: '',
            personasCalculadas: 0,
            ventaAcumulada: 0,
            costoAcumulado: 0,
            margenAcumulado: 0,
            subRows: [],
          },
        };
        grupos.set(id, grupo);
      }
      grupo.lineas.push(r);
    }

    return [...grupos.values()]
      .sort((a, b) => a.prioridad - b.prioridad || a.fila.nombre.localeCompare(b.fila.nombre))
      .map(({ fila, lineas }) => {
        const permitidos = new Set(lineas.map(r => r.id));
        for (const r of lineas) {
          const montos = montosDe(r);
          fila.cantidadTotal += montos.cantidad;
          fila.personasCalculadas = Number(fila.personasCalculadas) + montos.personas;
          fila.ventaAcumulada += montos.venta;
          fila.costoAcumulado += montos.costo;
          fila.margenAcumulado += montos.margen;
        }
        const raices = lineas.filter(r => !r.comboParentId || !permitidos.has(r.comboParentId));
        const orden: number[] = [];
        const padresItem: number[] = [];
        for (const r of raices) {
          const padre = r.comboParentId ? porId.get(r.comboParentId) : undefined;
          if (!padre) {
            if (!orden.includes(r.itemId)) orden.push(r.itemId);
          } else if (!padresItem.includes(padre.itemId)) {
            padresItem.push(padre.itemId);
          }
        }
        for (const itemId of ordenCatalogo(padresItem)) {
          if (!orden.includes(itemId) && raices.some(r => r.itemId === itemId)) orden.push(itemId);
        }
        for (const r of raices) {
          if (!orden.includes(r.itemId)) orden.push(r.itemId);
        }
        const catId = Number(fila.id.replace('cat-', '')) || 0;
        const subRows = orden
          .map(itemId => filaCombo(raices.filter(r => r.itemId === itemId), [itemId], permitidos, catId))
          .filter(row => row.cantidadTotal > 0 || row.ventaAcumulada !== 0 || row.costoAcumulado !== 0);
        return { ...fila, subRows: subRows.length > 0 ? subRows : undefined };
      });
  }, [data, porCategoria, recursos, catalogoItems, categoriasCat, catalogoListo]);

  const dataVisible = useMemo(() => {
    if (porCategoria && !catalogoListo) return [];
    const q = busqueda.trim();
    if (!q) return dataBase;
    const walk = (row: HierarchicalData): HierarchicalData | null => {
      const hijos = (row.subRows ?? []).map(walk).filter((h): h is HierarchicalData => h !== null);
      const self = incluyeTexto(q, row.nombre, row.turnoDesc, row.descansoDesc, row.categoria, ...Object.values(row.combosRHDesc ?? {}));
      if (!self && hijos.length === 0) return null;
      return { ...row, subRows: self ? row.subRows : hijos };
    };
    return dataBase.map(walk).filter((h): h is HierarchicalData => h !== null);
  }, [dataBase, busqueda, porCategoria, catalogoListo]);

  const filas = useMemo(() => {
    if (!porCategoria) return dataVisible;
    const forzar = busqueda.trim().length > 0;
    const out: HierarchicalData[] = [];
    const walk = (list: HierarchicalData[], profundidad: number) => {
      for (const row of list) {
        const tieneHijos = !!row.subRows?.length;
        const abierto = tieneHijos && (forzar || !cerrados.has(row.id));
        out.push({ ...row, subRows: undefined, profundidad, tieneHijos, abierto });
        if (abierto && row.subRows) walk(row.subRows, profundidad + 1);
      }
    };
    walk(dataVisible, 0);
    return out;
  }, [porCategoria, dataVisible, busqueda, cerrados]);

  const toggleFila = (id: string) => {
    setCerrados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    } catch(e) {
      return val.toFixed(2);
    }
  };

  const columns = useMemo<ColumnDef<HierarchicalData>[]>(() => [
    {
      id: 'nombre',
      header: porCategoria
        ? () => (
            <div className="flex items-center gap-2">
              <span>Categoría</span>
              <button
                type="button"
                onClick={() => setCerrados(new Set())}
                title="Expandir todo"
                className="inline-flex items-center gap-0.5 text-[10px] font-normal text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors"
              >
                <ChevronsUpDown className="w-3 h-3" />
                Expandir
              </button>
              <button
                type="button"
                onClick={() => setCerrados(new Set(idsConHijos(dataBase)))}
                title="Colapsar todo"
                className="inline-flex items-center gap-0.5 text-[10px] font-normal text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors"
              >
                <ChevronsDownUp className="w-3 h-3" />
                Colapsar
              </button>
            </div>
          )
        : 'Item',
      accessorKey: 'nombre',
      cell: ({ row, getValue }) => {
        if (!porCategoria) {
          return (
            <div
              className={`flex items-center gap-2 ${row.getCanExpand() ? 'cursor-pointer select-none font-semibold text-blue-600' : 'pl-6 font-medium text-slate-700'}`}
              onClick={row.getToggleExpandedHandler()}
            >
              {row.getCanExpand() && (
                row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
              {getValue() as string}
            </div>
          );
        }
        const profundidad = row.original.profundidad ?? 0;
        const tieneHijos = !!row.original.tieneHijos;
        return (
          <div
            className={`flex items-center gap-1.5 ${tieneHijos ? 'cursor-pointer select-none' : ''}`}
            style={{ paddingLeft: profundidad * 20 }}
            onClick={tieneHijos ? () => toggleFila(row.original.id) : undefined}
          >
            {tieneHijos
              ? (row.original.abierto
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />)
              : <span className="w-3.5 shrink-0" />}
            <span className={row.original.esCategoria ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}>
              {getValue() as string}
            </span>
          </div>
        );
      },
    },
    {
      id: 'cantidadTotal',
      header: () => <div className="text-center">Cantidad</div>,
      accessorKey: 'cantidadTotal',
      cell: ({ getValue }) => <div className="text-center">{getValue() as number}</div>,
    },
    {
      id: 'turnoDesc',
      header: 'Turno',
      accessorKey: 'turnoDesc',
      cell: ({ getValue, row }) => {
        if (row.original.esCategoria) return null;
        const esVariacion = porCategoria ? (row.original.profundidad ?? 0) > 1 : row.depth > 0;
        return (
          <span className={esVariacion ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
            {getValue() as string}
          </span>
        );
      },
    },
    // Dynamic columns: one per TipoComboRH tipo active for the company
    ...tiposComboRH.map(tipo => ({
      id: `comboRH_${tipo.id}`,
      header: tipo.nombre,
      accessorFn: (row: HierarchicalData) => row.esCategoria ? '' : (row.combosRHDesc?.[tipo.id] ?? '-'),
      cell: ({ getValue, row }: any) => {
        if (row.original.esCategoria) return null;
        const esVariacion = porCategoria ? (row.original.profundidad ?? 0) > 1 : row.depth > 0;
        return (
          <span className={esVariacion ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
            {getValue() as string}
          </span>
        );
      },
    })),
    {
      id: 'descansoDesc',
      header: 'Descanso',
      accessorKey: 'descansoDesc',
      cell: ({ getValue, row }) => {
        if (row.original.esCategoria) return null;
        const esVariacion = porCategoria ? (row.original.profundidad ?? 0) > 1 : row.depth > 0;
        return (
          <span className={esVariacion ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
            {getValue() as string}
          </span>
        );
      },
    },
    {
      id: 'personasCalculadas',
      header: () => <div className="text-center">Personas</div>,
      accessorKey: 'personasCalculadas',
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.esCategoria
            ? (Number(row.original.personasCalculadas) > 0 ? row.original.personasCalculadas : '')
            : row.original.categoria === 'RECURSO_HUMANO' ? row.original.personasCalculadas : '-'}
        </div>
      ),
    },
    {
      id: 'ventaAcumulada',
      header: () => <div className="text-right">Total Venta ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'ventaAcumulada',
      cell: ({ getValue }) => <div className="text-right font-medium text-slate-800">{formatCurrency(getValue() as number)}</div>,
    },
    {
      id: 'costoAcumulado',
      header: () => <div className="text-right">Costo Total ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'costoAcumulado',
      cell: ({ getValue }) => <div className="text-right font-medium text-slate-800">{formatCurrency(getValue() as number)}</div>,
    },
    {
      id: 'margenAcumulado',
      header: () => <div className="text-right">Margen ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'margenAcumulado',
      cell: ({ getValue }) => <div className="text-right font-medium text-emerald-600">{formatCurrency(getValue() as number)}</div>,
    },
  ], [proyecto?.moneda, tiposComboRH, porCategoria, dataBase]);

  const table = useReactTable({
    data: filas,
    columns,
    enableSorting: false,
    autoResetExpanded: false,
    getRowId: row => row.id,
    state: { expanded: porCategoria ? {} : (busqueda.trim() ? true : expanded) },
    onExpandedChange: setExpanded,
    getSubRows: row => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Calculate grand totals for footer based on top-level data only
  const totalPersonas = data.reduce((sum, r) => sum + (r.categoria === 'RECURSO_HUMANO' ? (r.personasCalculadas as number) : 0), 0);
  const totalVenta = data.reduce((sum, r) => sum + r.ventaAcumulada, 0);
  const totalCosto = data.reduce((sum, r) => sum + r.costoAcumulado, 0);
  const totalMargen = data.reduce((sum, r) => sum + r.margenAcumulado, 0);

  return (
    <div className={porCategoria ? 'flex flex-col flex-1 min-h-0 min-w-0 gap-2' : 'mt-4 space-y-2'}>
      <BuscadorTabla value={busqueda} onChange={setBusqueda} />
      <div className={porCategoria
        ? 'border rounded-md bg-white shadow-sm flex-1 min-h-0 min-w-0 overflow-auto'
        : 'border rounded-md overflow-x-auto bg-white shadow-sm min-w-0'}>
      {porCategoria && !catalogoListo ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          Cargando catálogos...
        </div>
      ) : data.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No hay recursos asignados.
        </div>
      ) : (
          <table className="w-max min-w-full text-sm text-left whitespace-nowrap">
            <thead className={porCategoria ? 'bg-slate-50 border-b sticky top-0 z-10 [&_th]:bg-slate-50' : 'bg-slate-50 border-b'}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const id = header.column.id
                    const align =
                      id === 'cantidadTotal' || id === 'personasCalculadas'
                        ? 'text-center'
                        : id === 'ventaAcumulada' || id === 'costoAcumulado' || id === 'margenAcumulado'
                          ? 'text-right'
                          : 'text-left'
                    return (
                    <th key={header.id} className={`px-3 py-2 text-xs font-semibold text-slate-500 ${align}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={8 + tiposComboRH.length} className="py-6 px-3 text-center text-sm text-slate-500">
                    No se encontraron resultados.
                  </td>
                </tr>
              ) : table.getRowModel().rows.map((row, filaIdx) => (
                <tr
                  key={row.id}
                  className={claseFilaTabla(filaIdx)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-2 px-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t font-semibold text-slate-800">
              <tr>
                <td colSpan={4 + tiposComboRH.length} className="py-2 px-3 text-right">Totales:</td>
                <td className="py-2 px-3 text-center">{totalPersonas}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totalVenta)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totalCosto)}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(totalMargen)}</td>
              </tr>
            </tfoot>
          </table>
      )}
      </div>
    </div>
  );
}
