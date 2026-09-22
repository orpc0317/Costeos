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
import { ChevronDown, ChevronRight } from 'lucide-react';
import { UI_THEME } from '@/lib/theme';
import { listarItems } from '@/app/actions/items';
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
  subRows?: HierarchicalData[];
}

export function RecursosSummaryTable({ recursos }: { recursos: RecursoSummaryItem[] }) {
  const { proyecto } = useCosteo();
  const [turnos, setTurnos] = useState<ErpTurno[]>([]);
  const [uniformesItems, setUniformesItems] = useState<ItemRow[]>([]);
  const [tiposComboRH, setTiposComboRH] = useState<TipoComboRHRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  useEffect(() => {
    let active = true;
    if (!proyecto?.empresaId) return;
    
    const fetchData = async () => {
      setLoading(true);
      const [tData, itemsData, tiposData] = await Promise.all([
        getTurnosERP(proyecto.empresaId),
        listarItems(),
        listarTiposComboRHPorEmpresa(proyecto.empresaId),
      ]);
      if (active) {
        setTurnos(tData);
        // Filtrar items de la empresa con bandera uniforme=1
        setUniformesItems(itemsData.filter(i => i.empresaId === proyecto.empresaId && i.uniforme === 1));
        setTiposComboRH(tiposData);
        setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [proyecto?.empresaId]);

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
      header: 'Item / Descripción',
      accessorKey: 'nombre',
      cell: ({ row, getValue }) => {
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
      },
    },
    {
      id: 'cantidadTotal',
      header: () => <div className="text-center">Cant.</div>,
      accessorKey: 'cantidadTotal',
      cell: ({ getValue }) => <div className="text-center">{getValue() as number}</div>,
    },
    {
      id: 'turnoDesc',
      header: 'Turno',
      accessorKey: 'turnoDesc',
      cell: ({ getValue, row }) => (
        <span className={row.depth > 0 ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
          {getValue() as string}
        </span>
      ),
    },
    // Dynamic columns: one per TipoComboRH tipo active for the company
    ...tiposComboRH.map(tipo => ({
      id: `comboRH_${tipo.id}`,
      header: tipo.nombre,
      accessorFn: (row: HierarchicalData) => row.combosRHDesc?.[tipo.id] ?? '-',
      cell: ({ getValue, row }: any) => (
        <span className={row.depth > 0 ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
          {getValue() as string}
        </span>
      ),
    })),
    {
      id: 'descansoDesc',
      header: 'Descanso',
      accessorKey: 'descansoDesc',
      cell: ({ getValue, row }) => (
        <span className={row.depth > 0 ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'personasCalculadas',
      header: () => <div className="text-center">Personas</div>,
      accessorKey: 'personasCalculadas',
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.categoria === 'RECURSO_HUMANO' ? row.original.personasCalculadas : '-'}
        </div>
      ),
    },
    {
      id: 'ventaAcumulada',
      header: () => <div className="text-right">Venta ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'ventaAcumulada',
      cell: ({ getValue }) => <div className="text-right font-medium text-slate-800">{formatCurrency(getValue() as number)}</div>,
    },
    {
      id: 'costoAcumulado',
      header: () => <div className="text-right">Costo ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'costoAcumulado',
      cell: ({ getValue }) => <div className="text-right font-medium text-slate-800">{formatCurrency(getValue() as number)}</div>,
    },
    {
      id: 'margenAcumulado',
      header: () => <div className="text-right">Margen ({proyecto?.moneda || 'Q'})</div>,
      accessorKey: 'margenAcumulado',
      cell: ({ getValue }) => <div className="text-right font-medium text-emerald-600">{formatCurrency(getValue() as number)}</div>,
    },
  ], [proyecto?.moneda, tiposComboRH]);

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
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
    <div className="mt-4 border rounded-md overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-100 p-3 font-semibold text-slate-700 border-b flex justify-between items-center">
        <span>Recursos Asignados (Resumen)</span>
        {loading && <span className="text-xs text-slate-500 font-normal">Cargando catálogos...</span>}
      </div>
      
      {data.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No hay recursos asignados.
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] text-sm text-left whitespace-nowrap">
            <thead className={UI_THEME.table.headerBg}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className={`${UI_THEME.table.border} border-b`}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className={`py-2 px-3 ${UI_THEME.table.headerText}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className={`border-b last:border-0 hover:bg-slate-50 ${row.depth > 0 ? 'bg-slate-50/50' : 'bg-white'}`}
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
        </div>
      )}
    </div>
  );
}
