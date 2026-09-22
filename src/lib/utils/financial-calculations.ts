// src/lib/utils/financial-calculations.ts

import { ProyectoCosteo, RecursoCosteo, NodoCosteo, RecetaCosteo, ItemRecetaCosteo } from '../types/costeos';

export interface ResumenFinanciero {
  totalCostoMensual: number;
  totalCostoUnico: number;
  totalCostoProyecto: number; // Mensual * meses + Único

  totalVentaMensual: number;
  totalVentaUnico: number;
  totalVentaProyecto: number; // Mensual * meses + Único

  grossMarginProyecto: number; // % (Venta - Costo) / Venta
  roiProyecto: number; // % (Venta - Costo) / Costo

  totalPersonas: number;
  totalHorasHombre: number;

  desgloseCostoCategoria: Record<string, number>; // Ej: { 'RECURSO_HUMANO': 15000, 'EQUIPO': 2000 }
}

export function calcularResumenFinanciero(proyecto: ProyectoCosteo, selectedNode?: { type: string, id: string }): ResumenFinanciero {
  const plazo = proyecto.plazoMeses || 1; // Prevenir división por cero si aún no se define
  const resumen: ResumenFinanciero = {
    totalCostoMensual: 0,
    totalCostoUnico: 0,
    totalCostoProyecto: 0,
    totalVentaMensual: 0,
    totalVentaUnico: 0,
    totalVentaProyecto: 0,
    grossMarginProyecto: 0,
    roiProyecto: 0,
    totalPersonas: 0,
    totalHorasHombre: 0,
    desgloseCostoCategoria: {},
  };

  const procesarReceta = (receta: RecetaCosteo, cantidadPadre: number) => {
    receta.items.forEach((item) => {
      procesarItemReceta(item, cantidadPadre);
    });
  };

  const procesarItemReceta = (item: ItemRecetaCosteo, cantidadPadre: number) => {
    const cantidadTotal = item.cantidad * cantidadPadre;
    const costoTotal = item.costoUnitario * cantidadTotal;

    if (item.tipoCosto === 'MENSUAL') {
      resumen.totalCostoMensual += costoTotal;
    } else {
      resumen.totalCostoUnico += costoTotal;
    }

    resumen.desgloseCostoCategoria[item.categoria] = (resumen.desgloseCostoCategoria[item.categoria] || 0) + costoTotal;

    if (item.subRecetas) {
      item.subRecetas.forEach((subReceta) => procesarReceta(subReceta, cantidadTotal));
    }
  };

  const procesarRecurso = (recurso: RecursoCosteo) => {
    const factor = recurso.categoria === 'RECURSO_HUMANO' ? ((recurso.cantidad || 1) * (recurso.personas || 1)) : (recurso.cantidad || 1);
    
    let costoTotal = (recurso.costoUnitario || 0) * factor;
    let ventaTotal = (recurso.precioVentaUnitario || 0) * factor;

    if (recurso.bonos && recurso.bonos.length > 0) {
      const bonosCosto = recurso.bonos.reduce((sum, b) => sum + (b.costoUnitario || 0), 0) * factor;
      costoTotal += bonosCosto;
    }

    if (recurso.tipoCosto === 'MENSUAL') {
      resumen.totalCostoMensual += costoTotal;
      resumen.totalVentaMensual += ventaTotal;
    } else {
      resumen.totalCostoUnico += costoTotal;
      resumen.totalVentaUnico += ventaTotal;
    }

    resumen.desgloseCostoCategoria[recurso.categoria] = (resumen.desgloseCostoCategoria[recurso.categoria] || 0) + costoTotal;

    if (recurso.categoria === 'RECURSO_HUMANO') {
      resumen.totalPersonas += (recurso.personas || 1) * recurso.cantidad;
      resumen.totalHorasHombre += (recurso.horasSemana || 0) * recurso.cantidad;
    }

    recurso.recetas.forEach((receta) => procesarReceta(receta, recurso.cantidad));
  };

  /** Devuelve todos los IDs combo-descendientes de un recurso dentro de una lista plana. */
  const getComboDescendantIds = (recursos: RecursoCosteo[], rootId: string): Set<string> => {
    const ids = new Set<string>();
    const queue = [rootId];
    while (queue.length) {
      const parentId = queue.shift()!;
      recursos.filter(r => r.comboParentId === parentId).forEach(r => {
        ids.add(r.id);
        queue.push(r.id);
      });
    }
    return ids;
  };

  const checkIncludeResource = (recursoId: string, inSelectedNodeTree: boolean, comboDescendants?: Set<string>): boolean => {
    if (!selectedNode || selectedNode.type === 'PROYECTO') return true;
    if (selectedNode.type === 'RECURSO') {
      return selectedNode.id === recursoId || (comboDescendants?.has(recursoId) ?? false);
    }
    return inSelectedNodeTree;
  };

  const walkNodos = (nodos: NodoCosteo[], inSelectedTree: boolean) => {
    for (const nodo of nodos) {
      const isThisNodeSelected = selectedNode?.type === 'NODO' && selectedNode.id === nodo.id;
      const currentInTree = inSelectedTree || isThisNodeSelected;

      // Pre-calcular hijos combo del recurso seleccionado en este nodo
      const comboDesc = selectedNode?.type === 'RECURSO'
        ? getComboDescendantIds(nodo.recursos, selectedNode.id)
        : undefined;

      nodo.recursos.forEach(recurso => {
        if (checkIncludeResource(recurso.id, currentInTree, comboDesc)) {
          procesarRecurso(recurso);
        }
      });

      walkNodos(nodo.nodos, currentInTree);
    }
  };

  // Process root resources
  const rootComboDesc = selectedNode?.type === 'RECURSO'
    ? getComboDescendantIds(proyecto.recursos, selectedNode.id)
    : undefined;
  proyecto.recursos.forEach(recurso => {
    if (checkIncludeResource(recurso.id, false, rootComboDesc)) {
      procesarRecurso(recurso);
    }
  });

  walkNodos(proyecto.nodos, false);

  resumen.totalCostoProyecto = (resumen.totalCostoMensual * plazo) + resumen.totalCostoUnico;
  resumen.totalVentaProyecto = (resumen.totalVentaMensual * plazo) + resumen.totalVentaUnico;

  const factorOverhead = (proyecto.porcentajeOverhead || 0) / 100;
  const factorContingencia = (proyecto.porcentajeContingencia || 0) / 100;

  resumen.totalCostoProyecto += (resumen.totalCostoProyecto * factorOverhead);
  resumen.totalCostoProyecto += (resumen.totalCostoProyecto * factorContingencia);

  if (resumen.totalVentaProyecto > 0) {
    resumen.grossMarginProyecto = ((resumen.totalVentaProyecto - resumen.totalCostoProyecto) / resumen.totalVentaProyecto) * 100;
  }
  
  if (resumen.totalCostoProyecto > 0) {
    resumen.roiProyecto = ((resumen.totalVentaProyecto - resumen.totalCostoProyecto) / resumen.totalCostoProyecto) * 100;
  }

  return resumen;
}
