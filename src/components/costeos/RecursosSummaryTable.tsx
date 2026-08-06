import React, { useState, useEffect, useMemo } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { getTurnos, getUniformes, TurnoItem, UniformeItem } from '@/app/actions/puestos';
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
import { TABLE_THEME } from '@/components/ui/data-table';

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
  uniformeDesc: string;
  descansoDesc: string;
  personasCalculadas: number | string;
  ventaAcumulada: number;
  costoAcumulado: number;
  margenAcumulado: number;
  subRows?: HierarchicalData[];
}

export function RecursosSummaryTable({ recursos }: { recursos: RecursoSummaryItem[] }) {
  const { proyecto } = useCosteo();
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  useEffect(() => {
    let active = true;
    if (!proyecto?.empresaId) return;
    
    const fetchData = async () => {
      setLoading(true);
      const [tData, uData] = await Promise.all([
        getTurnos(proyecto.empresaId),
        getUniformes(proyecto.empresaId)
      ]);
      if (active) {
        setTurnos(tData);
        setUniformes(uData);
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
        venta += r.bonos.reduce((sum: number, b: any) => sum + (Number(b.precioVentaUnitario) || 0), 0) * baseFactor;
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
          uniformeDesc: '',
          descansoDesc: '',
          personasCalculadas: 0,
          ventaAcumulada: 0,
          costoAcumulado: 0,
          margenAcumulado: 0,
          subRows: []
        };
      }

      const childKey = `${parentId}-${r.turnoCodigo || 'NA'}-${r.uniformeCodigo || 'NA'}-${r.cubreDescanso || 0}-${r.personas || 1}`;
      let child = padres[parentId].subRows!.find(c => c.id === childKey);
      
      if (!child) {
        const tDesc = turnos.find(t => t.codigo === r.turnoCodigo)?.descripcion || '-';
        const uDesc = uniformes.find(u => u.codigo === r.uniformeCodigo)?.descripcion || '-';
        const dFull = OPCIONES_CUBRE_DESCANSO.find(o => o.value === (r.cubreDescanso || 0))?.label || '-';
        
        child = {
          id: childKey,
          nombre: '', // Empty for children, as it will be grouped under parent
          categoria: r.categoria || '',
          cantidadTotal: 0,
          turnoDesc: tDesc,
          uniformeDesc: uDesc,
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
          uniformeDesc: child.uniformeDesc,
          descansoDesc: child.descansoDesc,
          subRows: undefined // Remove subrows so it's a flat row
        };
      } else {
        p.turnoDesc = 'Variados';
        p.uniformeDesc = 'Variados';
        p.descansoDesc = 'Variados';
        return p;
      }
    });
  }, [recursos, turnos, uniformes]);

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
    {
      id: 'uniformeDesc',
      header: 'Uniforme',
      accessorKey: 'uniformeDesc',
      cell: ({ getValue, row }) => (
        <span className={row.depth > 0 ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs italic'}>
          {getValue() as string}
        </span>
      ),
    },
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
  ], [proyecto?.moneda]);

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
            <thead className={TABLE_THEME.headerBg}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className={`${TABLE_THEME.borderColor} border-b`}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className={`py-2 px-3 ${TABLE_THEME.headerFont} ${TABLE_THEME.headerTextColor}`}>
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
                <td colSpan={5} className="py-2 px-3 text-right">Totales:</td>
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
