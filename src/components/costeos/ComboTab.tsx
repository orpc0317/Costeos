"use client";

import React, { useState } from 'react';
import { useCosteo } from '@/lib/context/CosteoContext';
import { ComboDisponible, RecursoCosteo } from '@/lib/types/costeos';
import { NumericInput } from '@/components/ui/numeric-input';
import { Minus, Plus } from 'lucide-react';

interface ComboTabProps {
  recurso: RecursoCosteo;
  parentId: string | null;
  esBorrador: boolean;
  hermanos: RecursoCosteo[];
}

export function ComboTab({ recurso, parentId, esBorrador, hermanos }: ComboTabProps) {
  const { dispatch } = useCosteo();

  // Estado local para costo de ítems NO aún en el árbol (solo para manejoCostos=4)
  const [localCosts, setLocalCosts] = useState<Record<number, number>>({});

  const combosDisponibles = recurso.combosDisponibles;
  if (!combosDisponibles || combosDisponibles.length === 0) return null;

  /** Cantidad efectiva del recurso raíz */
  const rootEffectiveQty =
    recurso.categoria === 'RECURSO_HUMANO'
      ? (recurso.cantidad || 1) * (recurso.personas || 1)
      : (recurso.cantidad || 1);

  const findComboEnArbol = (itemId: number, parentRecursoId: string): RecursoCosteo | undefined =>
    hermanos.find(h => h.esCombo && h.itemId === itemId && h.comboParentId === parentRecursoId);


  const handleAgregar = (
    combo: ComboDisponible,
    parentRecursoId: string,
    calculatedQty: number,
    costoUnitario: number,
  ) => {
    const nuevoId = `REC-${Date.now()}-C${combo.productoSecundarioId}`;

    dispatch({
      type: 'ADD_RECURSO',
      payload: {
        nodoId: parentId,
        recurso: {
          id: nuevoId,
          itemId: combo.productoSecundarioId,
          nombre: combo.nombre,
          categoria: 'SERVICIO' as any,
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

    // Limpiar costo local al agregar
    setLocalCosts(prev => { const n = { ...prev }; delete n[combo.productoSecundarioId]; return n; });

    // Cascada: hijos con nuevoIncluido=1
    if (combo.hijos?.length) {
      let delay = 1;
      for (const hijo of combo.hijos) {
        if (!hijo.nuevoIncluido) continue;
        const hijoQty = calculatedQty * Math.max(1, hijo.nuevoCantidad);
        const hijoId = `REC-${Date.now() + delay++}-C${hijo.productoSecundarioId}`;
        dispatch({
          type: 'ADD_RECURSO',
          payload: {
            nodoId: parentId,
            recurso: {
              id: hijoId,
              itemId: hijo.productoSecundarioId,
              nombre: hijo.nombre,
              categoria: 'SERVICIO' as any,
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

  const handleCambiarCantidad = (enArbol: RecursoCosteo, newQty: number) => {
    if (newQty <= 0) {
      // Cantidad 0 = quitar del árbol
      dispatch({ type: 'REMOVE_RECURSO', payload: { recursoId: enArbol.id } });
    } else {
      dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: enArbol.id, data: { cantidad: newQty } } });
    }
  };

  const handleCambiarCosto = (enArbol: RecursoCosteo, newCosto: number) => {
    dispatch({ type: 'UPDATE_RECURSO', payload: { recursoId: enArbol.id, data: { costoUnitario: newCosto } } });
  };

  /** Guías visuales de árbol */
  const TreeGuide = ({ depth, faded = false }: { depth: number; faded?: boolean }) => {
    if (depth === 0) return null;
    const line = faded ? 'border-slate-100' : 'border-slate-200';
    const connector = faded ? 'border-slate-200' : 'border-slate-300';
    return (
      <span className="flex items-center shrink-0" style={{ width: depth * 20 }}>
        {Array.from({ length: depth - 1 }).map((_, i) => (
          <span key={i} className={`inline-block w-5 shrink-0 border-l border-dashed ${line} h-5`} />
        ))}
        <span className="inline-flex items-center shrink-0 w-5">
          <span className={`w-5 border-t border-dashed ${connector}`} />
        </span>
      </span>
    );
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderComboRow = (
    combo: ComboDisponible,
    parentRecursoId: string,
    depth: number,
    parentEffectiveQty: number,
    disabledByParent: boolean = false,   // true cuando el padre no está incluido en el árbol
  ): React.ReactNode => {
    const calculatedQty = parentEffectiveQty * Math.max(1, combo.nuevoCantidad);
    // Si el padre está deshabilitado, este nodo también lo está (no buscar en árbol)
    const enArbol = disabledByParent ? undefined : findComboEnArbol(combo.productoSecundarioId, parentRecursoId);
    const esRequerido = combo.nuevoRequerido === 1;
    const tieneHijos = (combo.hijos?.length ?? 0) > 0;
    const recursoIdEnArbol = enArbol?.id ?? '';
    const solicitarCosto = combo.manejoCostos === 4;
    const defaultCosto = combo.manejoCostos === 99 ? 0 : (combo.costosManuales ?? 0);

    // Cantidad efectiva en este nivel
    // displayQty: si está en árbol usa el valor real; si no, siempre el calculado por defecto
    const displayQty = enArbol ? (enArbol.cantidad ?? calculatedQty) : calculatedQty;

    // Costo efectivo
    const displayCosto = enArbol
      ? (enArbol.costoUnitario ?? defaultCosto)
      : (localCosts[combo.productoSecundarioId] ?? defaultCosto);

    // Controles de cantidad — centrados en todos los casos
    const QtyControls = () => {
      // Sin árbol → solo mostrar el default en read-only (gris)
      if (!enArbol) {
        return <span className="text-sm text-slate-300">{calculatedQty}</span>;
      }
      // Requerido o no borrador → mostrar cantidad fija
      if (esRequerido || !esBorrador) {
        return <span className="text-sm text-slate-600 font-medium">{displayQty}</span>;
      }
      // En árbol + puede editar → +/− centrados
      return (
        <div className="flex items-center gap-0.5 justify-center">
          <button
            type="button"
            onClick={() => handleCambiarCantidad(enArbol, displayQty - 1)}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[24px] text-center">{displayQty}</span>
          <button
            type="button"
            onClick={() => handleCambiarCantidad(enArbol, displayQty + 1)}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      );
    };

    // Campo de Costo
    const CostoField = () => {
      if (!solicitarCosto) {
        return (
          <span className={`text-sm ${enArbol ? 'text-slate-700' : 'text-slate-300'}`}>
            {fmt(displayCosto)}
          </span>
        );
      }
      if (enArbol && esBorrador) {
        return (
          <NumericInput
            value={displayCosto}
            onChange={(val) => handleCambiarCosto(enArbol, val ?? 0)}
            min="0"
            className="h-6 w-24 text-right text-xs border-slate-200 bg-white px-1.5 rounded-sm focus-visible:ring-1 focus-visible:ring-blue-400"
          />
        );
      }
      if (!enArbol && esBorrador) {
        return (
          <NumericInput
            value={displayCosto}
            onChange={(val) => setLocalCosts(prev => ({ ...prev, [combo.productoSecundarioId]: val ?? 0 }))}
            min="0"
            className="h-6 w-24 text-right text-xs border-slate-200 bg-slate-50 text-slate-400 px-1.5 rounded-sm focus-visible:ring-1 focus-visible:ring-blue-400"
          />
        );
      }
      return <span className="text-sm text-slate-400">{fmt(displayCosto)}</span>;
    };

    return (
      <React.Fragment key={`${combo.comboId}-${parentRecursoId}`}>
        <tr className="border-t hover:bg-slate-50/50">
          {/* Sub-ítem */}
          <td className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <TreeGuide depth={depth} />
              <span className={`text-sm ${enArbol ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                {combo.nombre}
              </span>
              {combo.nuevoIncluido === 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 font-medium shrink-0">
                  Opcional
                </span>
              )}
            </div>
          </td>
          {/* Medida */}
          <td className="px-3 py-1.5 text-left w-20">
            <span className={`text-xs ${enArbol ? 'text-slate-500' : 'text-slate-300'}`}>
              {combo.unidadMedida ?? '—'}
            </span>
          </td>
          {/* Cantidad */}
          <td className="px-3 py-1.5 text-center w-28">
            <QtyControls />
          </td>
          {/* Costo */}
          <td className="px-3 py-1.5 text-right w-28">
            <CostoField />
          </td>
          {/* Incluido */}
          <td className="px-3 py-1.5 text-center w-20">
            <input
              type="checkbox"
              checked={!!enArbol}
              disabled={esRequerido || !esBorrador || disabledByParent}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={() => {
                if (enArbol) handleQuitar(enArbol);
                else handleAgregar(combo, parentRecursoId, displayQty, displayCosto);
              }}
            />
          </td>
        </tr>

        {/* Hijos — siempre visibles; disabledByParent=true cuando el padre no está incluido */}
        {tieneHijos && combo.hijos?.map(hijo =>
          renderComboRow(
            hijo,
            recursoIdEnArbol,
            depth + 1,
            displayQty,
            disabledByParent || !enArbol,   // si el padre no está → hijos también deshabilitados
          )
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-slate-500">
        Sub-ítems del combo. Los ítems con checkbox bloqueado son <strong>Requeridos</strong>.
        Ajusta la cantidad con los botones +/−{' '}
        <span className="text-slate-400">(cantidad 0 elimina el ítem del costeo)</span>.
      </p>

      <div className="border rounded-md overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Sub-ítem</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-20">Medida</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-28">Cantidad</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-28">Costo</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 w-20">Incluido</th>
            </tr>
          </thead>
          <tbody>
            {combosDisponibles.map(combo =>
              renderComboRow(combo, recurso.id, 0, rootEffectiveQty)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
