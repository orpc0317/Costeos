// src/lib/utils/financial-calculations.ts

import { ProyectoCosteo, RecursoCosteo, SitioCosteo, RecetaCosteo, ItemRecetaCosteo } from '../types/costeos';

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

  // Función recursiva para procesar Recetas e Items de Recetas
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

  // Procesar Recursos
  const procesarRecurso = (recurso: RecursoCosteo) => {
    const costoTotal = recurso.costoUnitario * recurso.cantidad;
    const ventaTotal = (recurso.precioVentaUnitario || 0) * recurso.cantidad;

    if (recurso.tipoCosto === 'MENSUAL') {
      resumen.totalCostoMensual += costoTotal;
      resumen.totalVentaMensual += ventaTotal;
    } else {
      resumen.totalCostoUnico += costoTotal;
      resumen.totalVentaUnico += ventaTotal;
    }

    resumen.desgloseCostoCategoria[recurso.categoria] = (resumen.desgloseCostoCategoria[recurso.categoria] || 0) + costoTotal;

    // Procesar sus recetas
    recurso.recetas.forEach((receta) => procesarReceta(receta, recurso.cantidad));
  };

  // Iterar por todo el árbol del proyecto
  proyecto.sitios.forEach((sitio) => {
    // Si filtramos por SITIO y no es este, saltar
    if (selectedNode && selectedNode.type === 'SITIO' && selectedNode.id !== sitio.id) return;

    // Recursos sin puesto
    sitio.recursosSinPuesto.forEach((recurso) => {
      // Si filtramos por PUESTO, no mostramos recursos sin puesto
      if (selectedNode && selectedNode.type === 'PUESTO') return;
      // Si filtramos por RECURSO y no es este, saltar
      if (selectedNode && selectedNode.type === 'RECURSO' && selectedNode.id !== recurso.id) return;
      
      procesarRecurso(recurso);
    });

    // Recursos en puestos
    sitio.puestos.forEach((puesto) => {
      // Si filtramos por PUESTO y no es este, saltar
      if (selectedNode && selectedNode.type === 'PUESTO' && selectedNode.id !== puesto.id) return;

      // Las métricas del puesto se suman SOLO si no estamos filtrando por un RECURSO específico
      if (!selectedNode || selectedNode.type !== 'RECURSO') {
        // Contar personas de los recursos humanos
        const personas = puesto.recursos.filter(r => r.categoria === 'RECURSO_HUMANO').length;
        resumen.totalPersonas += personas;
        // horasSemana y ventaPuesto se manejan a nivel de Recurso ahora
      }
      
      puesto.recursos.forEach((recurso) => {
        // Si filtramos por RECURSO y no es este, saltar
        if (selectedNode && selectedNode.type === 'RECURSO' && selectedNode.id !== recurso.id) return;
        
        procesarRecurso(recurso);
      });
    });
  });

  // Calcular totales del proyecto considerando el plazo
  resumen.totalCostoProyecto = (resumen.totalCostoMensual * plazo) + resumen.totalCostoUnico;
  resumen.totalVentaProyecto = (resumen.totalVentaMensual * plazo) + resumen.totalVentaUnico;

  // Aplicar Overhead y Contingencia al costo total (si aplica al total, esto puede variar según la regla de negocio)
  const factorOverhead = (proyecto.porcentajeOverhead || 0) / 100;
  const factorContingencia = (proyecto.porcentajeContingencia || 0) / 100;

  resumen.totalCostoProyecto += (resumen.totalCostoProyecto * factorOverhead);
  resumen.totalCostoProyecto += (resumen.totalCostoProyecto * factorContingencia);

  // Calcular Indicadores
  if (resumen.totalVentaProyecto > 0) {
    resumen.grossMarginProyecto = ((resumen.totalVentaProyecto - resumen.totalCostoProyecto) / resumen.totalVentaProyecto) * 100;
  }
  
  if (resumen.totalCostoProyecto > 0) {
    resumen.roiProyecto = ((resumen.totalVentaProyecto - resumen.totalCostoProyecto) / resumen.totalCostoProyecto) * 100;
  }

  return resumen;
}
