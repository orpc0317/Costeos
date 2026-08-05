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
      // Calcular totales individuales del recurso para acumularlos correctamente
      const factor = r.categoria === 'RECURSO_HUMANO' ? ((r.cantidad || 1) * (r.personas || 1)) : (r.cantidad || 1);
      let costo = (r.costoUnitario || 0) * factor;
      let venta = (r.precioVentaUnitario || 0) * factor;

      if (r.bonos && r.bonos.length > 0) {
        const bonosCosto = r.bonos.reduce((sum: number, b: any) => sum + (Number(b.costoUnitario) || 0), 0) * factor;
        const bonosVenta = r.bonos.reduce((sum: number, b: any) => sum + (Number(b.precioVentaUnitario) || 0), 0) * factor;
        costo += bonosCosto;
        venta += bonosVenta;
      }

      const calcReceta = (receta: any, pCant: number) => {
        receta.items?.forEach((item: any) => {
          const qty = item.cantidad * pCant;
          costo += item.costoUnitario * qty;
          if (item.subRecetas) item.subRecetas.forEach((sr: any) => calcReceta(sr, qty));
        });
      };
      if (r.recetas) r.recetas.forEach((receta: any) => calcReceta(receta, r.cantidad || 1));

      // La llave ya no incluye el pathStr ni el precioVentaUnitario
      const key = `${r.erpItemId}-${r.turnoCodigo || 'NA'}-${r.uniformeCodigo || 'NA'}-${r.cubreDescanso || 0}-${r.personas || 1}`;
      
      if (!grupos[key]) {
        grupos[key] = {
          ...r,
          cantidadTotal: 0,
          costoAcumulado: 0,
          ventaAcumulada: 0,
        };
      }
      grupos[key].cantidadTotal += r.cantidad || 1;
      grupos[key].costoAcumulado += costo;
      grupos[key].ventaAcumulada += venta;
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



  return (
    <div className="mt-4 border rounded-md overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-100 p-3 font-semibold text-slate-700 border-b flex justify-between items-center">
        <span>Recursos Asignados (Resumen)</span>
        {loading && <span className="text-xs text-slate-500 font-normal">Cargando catálogos...</span>}
      </div>
      {recursosAgrupados.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No hay recursos asignados.
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="py-2 px-3 font-medium">Item / Descripción</th>
                <th className="py-2 px-3 font-medium text-center">Cant.</th>
                <th className="py-2 px-3 font-medium">Turno</th>
                <th className="py-2 px-3 font-medium">Uniforme</th>
                <th className="py-2 px-3 font-medium text-center">Personas</th>
                <th className="py-2 px-3 font-medium">Descanso</th>
                <th className="py-2 px-3 font-medium text-right">Venta ({proyecto?.moneda || 'Q'})</th>
                <th className="py-2 px-3 font-medium text-right">Costo ({proyecto?.moneda || 'Q'})</th>
                <th className="py-2 px-3 font-medium text-right">Margen ({proyecto?.moneda || 'Q'})</th>
              </tr>
            </thead>
            <tbody>
              {recursosAgrupados.map((g: any, i: number) => {
                const turnoDesc = turnos.find(t => t.codigo === g.turnoCodigo)?.descripcion || '-';
                const uniformeDesc = uniformes.find(u => u.codigo === g.uniformeCodigo)?.descripcion || '-';
                
                const descansoFull = OPCIONES_CUBRE_DESCANSO.find(o => o.value === (g.cubreDescanso || 0))?.label || '-';
                const descansoDesc = descansoFull.includes(' - ') ? descansoFull.split(' - ')[1] : descansoFull;

                const costoTotal = g.costoAcumulado || 0;
                const ventaTotal = g.ventaAcumulada || 0;
                const margenTotal = ventaTotal - costoTotal;
                const factor = g.categoria === 'RECURSO_HUMANO' ? ((g.cantidadTotal || 1) * (g.personas || 1)) : (g.cantidadTotal || 1);

                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-700">{g.nombre}</td>
                    <td className="py-2 px-3 text-center">{g.cantidadTotal}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{turnoDesc}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{uniformeDesc}</td>
                    <td className="py-2 px-3 text-center">{g.categoria === 'RECURSO_HUMANO' ? factor : '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-xs">{descansoDesc}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{formatCurrency(ventaTotal)}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{formatCurrency(costoTotal)}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCurrency(margenTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 border-t font-semibold text-slate-800">
              <tr>
                <td colSpan={4} className="py-2 px-3 text-right">Totales:</td>
                <td className="py-2 px-3 text-center">
                  {recursosAgrupados.reduce((sum, g) => sum + (g.categoria === 'RECURSO_HUMANO' ? ((g.cantidadTotal || 1) * (g.personas || 1)) : 0), 0)}
                </td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right">
                  {formatCurrency(recursosAgrupados.reduce((sum, g) => sum + (g.ventaAcumulada || 0), 0))}
                </td>
                <td className="py-2 px-3 text-right">
                  {formatCurrency(recursosAgrupados.reduce((sum, g) => sum + (g.costoAcumulado || 0), 0))}
                </td>
                <td className="py-2 px-3 text-right text-emerald-700">
                  {formatCurrency(recursosAgrupados.reduce((sum, g) => sum + ((g.ventaAcumulada || 0) - (g.costoAcumulado || 0)), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
