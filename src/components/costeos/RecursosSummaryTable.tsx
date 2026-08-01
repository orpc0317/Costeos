import React, { useState, useEffect, useMemo } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { getTurnos, getUniformes, TurnoItem, UniformeItem } from '@/app/actions/puestos';
import { RecursoCosteo } from '@/lib/types/costeos';

const OPCIONES_CUBRE_DESCANSO = [
  { value: 0, label: '0 - No Aplica' },
  { value: 1, label: '1 - Descansero' },
  { value: 2, label: '2 - Extrero' },
  { value: 3, label: '3 - Bono Descanso' }
];

interface RecursoSummaryItem extends RecursoCosteo {
  _path?: string[]; // Arrays of node names in the hierarchy
}

export function RecursosSummaryTable({ recursos }: { recursos: RecursoSummaryItem[] }) {
  const { proyecto } = useCosteo();
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Agrupar recursos
  const recursosAgrupados = useMemo(() => {
    const grupos: Record<string, any> = {};
    (recursos || []).forEach((r) => {
      const pathStr = (r._path || []).join(' > ');
      const key = `${pathStr}-${r.erpItemId}-${r.turnoCodigo || 'NA'}-${r.uniformeCodigo || 'NA'}-${r.cubreDescanso || 0}-${r.precioVentaUnitario || 0}`;
      if (!grupos[key]) {
        grupos[key] = {
          ...r,
          _pathStr: pathStr,
          cantidadTotal: 0,
        };
      }
      grupos[key].cantidadTotal += r.cantidad || 1;
    });
    return Object.values(grupos);
  }, [recursos]);

  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    } catch(e) {
      return val.toFixed(2);
    }
  };

  const showPath = (recursos || []).some(r => r._path && r._path.length > 0);

  return (
    <div className="mt-8 border rounded-md overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-100 p-3 font-semibold text-slate-700 border-b flex justify-between items-center">
        <span>Recursos Asignados (Resumen)</span>
        {loading && <span className="text-xs text-slate-500 font-normal">Cargando catálogos...</span>}
      </div>
      {recursosAgrupados.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No hay recursos asignados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                {showPath && <th className="py-2 px-3 font-medium">Ubicación</th>}
                <th className="py-2 px-3 font-medium">Item / Descripción</th>
                <th className="py-2 px-3 font-medium text-center">Cant.</th>
                <th className="py-2 px-3 font-medium">Turno</th>
                <th className="py-2 px-3 font-medium">Uniforme</th>
                <th className="py-2 px-3 font-medium">Descanso</th>
                <th className="py-2 px-3 font-medium text-right">Precio Un.</th>
                <th className="py-2 px-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recursosAgrupados.map((g: any, i: number) => {
                const turnoDesc = turnos.find(t => t.codigo === g.turnoCodigo)?.descripcion || '-';
                const uniformeDesc = uniformes.find(u => u.codigo === g.uniformeCodigo)?.descripcion || '-';
                const descansoDesc = OPCIONES_CUBRE_DESCANSO.find(o => o.value === (g.cubreDescanso || 0))?.label || '-';
                const total = (g.cantidadTotal || 0) * (g.precioVentaUnitario || 0);

                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    {showPath && <td className="py-2 px-3 text-slate-600 text-xs">{g._pathStr || '-'}</td>}
                    <td className="py-2 px-3 font-medium text-slate-700">{g.nombre}</td>
                    <td className="py-2 px-3 text-center">{g.cantidadTotal}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{turnoDesc}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{uniformeDesc}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{descansoDesc}</td>
                    <td className="py-2 px-3 text-right text-emerald-600">{proyecto?.moneda === 'GTQ' ? 'Q' : '$'} {formatCurrency(g.precioVentaUnitario || 0)}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{proyecto?.moneda === 'GTQ' ? 'Q' : '$'} {formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
