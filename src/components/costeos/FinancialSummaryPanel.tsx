"use client";

import React, { useState } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { TrendingUp, DollarSign, PieChart, Activity, CalendarClock } from 'lucide-react';

import { calcularResumenFinanciero } from '@/lib/utils/financial-calculations';
import { NodoCosteo } from '@/lib/types/costeos';

export default function FinancialSummaryPanel() {
  const { proyecto, selectedNode } = useCosteo();

  const baseEvaluacion = proyecto?.tipoCosteo?.baseEvaluacion || 'GLOBAL';
  const [viewMode, setViewMode] = useState<'MENSUAL' | 'ANUAL' | 'PROYECTO'>(
    baseEvaluacion === 'MENSUAL' ? 'MENSUAL' : 'PROYECTO'
  );

  if (!proyecto) return null;

  const resumen = calcularResumenFinanciero(proyecto, selectedNode || undefined);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  const plazo = Math.max(1, proyecto.plazoMeses || 1);
  let divisor = 1;
  if (viewMode === 'MENSUAL') divisor = plazo;
  else if (viewMode === 'ANUAL') divisor = plazo / 12;
  
  const dispVenta = resumen.totalVentaProyecto / divisor;
  const dispCosto = resumen.totalCostoProyecto / divisor;
  const dispMargen = dispVenta - dispCosto;
  const dispGrossMargin = dispVenta > 0 ? (dispMargen / dispVenta) * 100 : 0;

  let contextTitle = "Proyecto Completo";
  if (selectedNode) {
    if (selectedNode.type === 'PROYECTO') {
      contextTitle = proyecto.nombreProyecto || "Proyecto Completo";
    } else if (selectedNode.type === 'NODO') {
      const findNodo = (nodos: NodoCosteo[], id: string): NodoCosteo | null => {
        for (const n of nodos) {
          if (n.id === id) return n;
          const found = findNodo(n.nodos, id);
          if (found) return found;
        }
        return null;
      };
      const nodo = findNodo(proyecto.nodos, selectedNode.id);
      if (nodo) contextTitle = nodo.nombre || "Nodo";
    } else if (selectedNode.type === 'RECURSO') {
      const rRoot = proyecto.recursos.find(r => r.id === selectedNode.id);
      if (rRoot) contextTitle = rRoot.nombre || "Ítem";
      else {
        const findRecurso = (nodos: NodoCosteo[], id: string): string | null => {
          for (const n of nodos) {
            const r = n.recursos.find(rec => rec.id === id);
            if (r) return r.nombre;
            const found = findRecurso(n.nodos, id);
            if (found) return found;
          }
          return null;
        };
        const recNombre = findRecurso(proyecto.nodos, selectedNode.id);
        if (recNombre) contextTitle = recNombre || "Ítem";
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      <div className="p-4 border-b bg-white shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Resumen Financiero
            </h2>
            <p className="text-sm text-emerald-600 font-medium mt-1 truncate" title={contextTitle}>
              {contextTitle}
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('MENSUAL')}
            className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${viewMode === 'MENSUAL' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setViewMode('ANUAL')}
            className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${viewMode === 'ANUAL' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Anual
          </button>
          <button
            onClick={() => setViewMode('PROYECTO')}
            className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${viewMode === 'PROYECTO' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Plazo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-4">
          <div className="bg-slate-50 px-3 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Margen ({proyecto.moneda})
            </h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total Ventas</span>
              <span className="text-sm font-semibold text-slate-900">{formatNumber(dispVenta)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total Costos</span>
              <span className="text-sm font-semibold text-slate-900">{formatNumber(dispCosto)}</span>
            </div>
            <div className="pt-2 mt-2 border-t flex justify-between items-center">
              <span className="text-xs text-slate-700 font-bold">Margen Bruto</span>
              <span className={`text-sm font-bold ${dispMargen < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatNumber(dispMargen)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">% Margen Bruto</span>
              <span className={`text-sm font-bold ${dispGrossMargin < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatPercent(dispGrossMargin)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-4">
          <div className="bg-slate-50 px-3 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Operativos
            </h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total Personas</span>
              <span className="text-sm font-semibold text-slate-900">{resumen.totalPersonas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">HH Semanal</span>
              <span className="text-sm font-semibold text-slate-900">{resumen.totalHorasHombre}h</span>
            </div>
            <div className="pt-2 mt-2 border-t flex justify-between items-center">
              <span className="text-xs text-slate-700 font-bold">ROI Estimado</span>
              <span className={`text-sm font-bold ${resumen.roiProyecto < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatPercent(resumen.roiProyecto)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-600" />
              Flujo de Costos ({proyecto.moneda})
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Costo Mensual:</span>
              <span className="font-semibold">{formatNumber(resumen.totalCostoMensual)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Costo Único (Setup):</span>
              <span className="font-semibold">{formatNumber(resumen.totalCostoUnico)}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center">
              <span className="text-sm text-slate-600 font-medium">Overhead ({proyecto.porcentajeOverhead}%):</span>
              <span className="font-medium text-slate-700">Incluido</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Costos por Categoría ({proyecto.moneda})
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(resumen.desgloseCostoCategoria).map(([cat, amount]) => (
              <div key={cat} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">{cat.replace('_', ' ').toLowerCase()}</span>
                  <span className="font-medium">{formatNumber(amount)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${(amount / resumen.totalCostoProyecto) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
