"use client";

import React from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { TrendingUp, DollarSign, PieChart, Activity } from 'lucide-react';

import { calcularResumenFinanciero } from '@/lib/utils/financial-calculations';

export default function FinancialSummaryPanel() {
  const { proyecto, selectedNode } = useCosteo();

  if (!proyecto) return null;
  
  // Calculamos el resumen en tiempo real dependiendo del nodo seleccionado
  const resumen = calcularResumenFinanciero(proyecto, selectedNode || undefined);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: proyecto.moneda,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      <div className="p-4 border-b bg-white shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Resumen Financiero
        </h2>
        <p className="text-sm text-slate-500 mt-1">Cálculos en tiempo real</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* KPIs Principales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Venta Total</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(resumen.totalVentaProyecto)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Costo Total</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(resumen.totalCostoProyecto)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Personas</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{resumen.totalPersonas}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">HH Semanal</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{resumen.totalHorasHombre}h</p>
          </div>
        </div>

        {/* Márgenes */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Rentabilidad
            </h3>
          </div>
          <div className="p-4 flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{formatPercent(resumen.grossMarginProyecto)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Gross Margin</p>
            </div>
            <div className="w-px bg-slate-200 mx-2"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatPercent(resumen.roiProyecto)}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">ROI</p>
            </div>
          </div>
        </div>

        {/* Desglose Mensual vs Único */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-600" />
              Flujo de Costos
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Costo Mensual:</span>
              <span className="font-semibold">{formatCurrency(resumen.totalCostoMensual)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Costo Único (Setup):</span>
              <span className="font-semibold">{formatCurrency(resumen.totalCostoUnico)}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center">
              <span className="text-sm text-slate-600 font-medium">Overhead ({proyecto.porcentajeOverhead}%):</span>
              <span className="font-medium text-slate-700">Incluido</span>
            </div>
          </div>
        </div>

        {/* Desglose por Categoría */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Costos por Categoría
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(resumen.desgloseCostoCategoria).map(([cat, amount]) => (
              <div key={cat} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">{cat.replace('_', ' ').toLowerCase()}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
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
