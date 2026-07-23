/**
 * Fórmulas financieras de Costeos.
 *
 * Importar desde aquí — NUNCA reimplementar inline en componentes o Server Actions.
 *
 * Concepto clave: mensualizacion
 * ───────────────────────────────
 * Los items tienen tipo_costo = MENSUAL | UNICO.
 *
 *   MENSUAL → costo recurrente. Se multiplica × plazo_meses.
 *     Ejemplo: salario de un guardia.
 *     costo_mensual  = costo_unitario × cantidad
 *     costo_total    = costo_mensual  × plazo_meses
 *
 *   UNICO → costo de una sola vez. Fijo independientemente del plazo.
 *     Ejemplo: compra de un radio, uniforme.
 *     costo_total    = costo_unitario × cantidad
 *     costo_mensual  = costo_total / plazo_meses  (amortizado, solo para reporte)
 */

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export type TipoCosto = 'MENSUAL' | 'UNICO'

/**
 * Item con su receta expandida para el cálculo recursivo.
 * Se aplica tanto a recursos directos del Puesto como a items de Receta.
 */
export interface ItemCalculo {
  tipoCosto:     TipoCosto
  costoUnitario: number
  cantidad:      number
  recetaItems:   ItemCalculo[]  // items de la receta (expandida, hasta 4 niveles)
}

/**
 * Resultado del cálculo de un item individual (incluyendo su receta).
 */
export interface ItemResultado {
  costoMensual: number  // para UNICO: amortizado (total / plazo_meses)
  costoTotal:   number  // costo completo durante la vida del contrato
}

/**
 * Parámetros financieros del Costeo (overhead, contingencia, margen).
 */
export interface ParametrosCalculo {
  plazoMeses:      number   // duración del contrato en meses
  overheadPct:     number   // % overhead sobre costo directo
  contingenciaPct: number   // % contingencia sobre costo directo
  margenPct:       number   // % margen objetivo (sobre precio de venta)
}

/**
 * Resultado financiero completo del Costeo.
 */
export interface ResultadoCalculo {
  // Costo directo (suma de todos los recursos + recetas de todos los puestos)
  costoDirectoMensual:  number
  costoDirectoTotal:    number

  // Overhead y contingencia
  overheadMensual:      number
  contingenciaMensual:  number

  // Costo total (directo + overhead + contingencia)
  costoTotalMensual:    number
  costoTotalAnual:      number
  costoTotalProyecto:   number

  // Venta
  ventaMensual:         number
  ventaAnual:           number
  ventaTotalProyecto:   number

  // Indicadores
  grossMarginPct:       number  // (venta - costo) / venta × 100
  roiPct:               number  // (venta - costo) / costo × 100

  // Desglose por categoría: { "SALARIOS": { mensual, total }, ... }
  porCategoria: Record<string, { costoMensual: number; costoTotal: number }>
}

// ─── Cálculo por item ────────────────────────────────────────────────────────

/**
 * Calcula el costo mensual y total de un item, incluyendo recursivamente
 * todos los items de su receta (hasta 4 niveles).
 *
 * @param item     El item con su receta ya expandida
 * @param plazoMeses  Duración del contrato en meses
 */
export function calcularItem(item: ItemCalculo, plazoMeses: number): ItemResultado {
  // Costo propio del item
  const costoPropio =
    item.tipoCosto === 'MENSUAL'
      ? {
          mensual: item.costoUnitario * item.cantidad,
          total:   item.costoUnitario * item.cantidad * plazoMeses,
        }
      : {
          // UNICO: el costo es fijo; se amortiza solo para reporte mensual
          total:   item.costoUnitario * item.cantidad,
          mensual: (item.costoUnitario * item.cantidad) / plazoMeses,
        }

  // Costo de la receta (suma recursiva)
  const costoReceta = item.recetaItems.reduce(
    (acc, ri) => {
      const r = calcularItem(ri, plazoMeses)
      return {
        mensual: acc.mensual + r.costoMensual,
        total:   acc.total   + r.costoTotal,
      }
    },
    { mensual: 0, total: 0 },
  )

  return {
    costoMensual: round2(costoPropio.mensual + costoReceta.mensual),
    costoTotal:   round2(costoPropio.total   + costoReceta.total),
  }
}

// ─── Cálculo completo del Costeo ─────────────────────────────────────────────

/**
 * Calcula el resultado financiero completo de un Costeo.
 *
 * @param recursos     Todos los PuestoRecurso del Costeo, con recetas expandidas
 * @param ventaMensual Suma de (precioVenta × cantidad) de recursos con precio
 * @param params       Parámetros del Costeo (plazo, overhead, contingencia, margen)
 * @param categorias   Mapa de erp_item_id → nombre_categoria (para el desglose)
 */
export function calcularCosteo(
  recursos: Array<ItemCalculo & { categoriaItem: string }>,
  ventaMensual: number,
  params: ParametrosCalculo,
): ResultadoCalculo {
  const { plazoMeses, overheadPct, contingenciaPct } = params

  // Sumar costos de todos los recursos (incluye recetas expandidas)
  let costoDirectoMensual = 0
  let costoDirectoTotal   = 0
  const porCategoria: Record<string, { costoMensual: number; costoTotal: number }> = {}

  for (const recurso of recursos) {
    const r = calcularItem(recurso, plazoMeses)
    costoDirectoMensual += r.costoMensual
    costoDirectoTotal   += r.costoTotal

    const cat = recurso.categoriaItem || 'SIN CATEGORÍA'
    if (!porCategoria[cat]) porCategoria[cat] = { costoMensual: 0, costoTotal: 0 }
    porCategoria[cat].costoMensual += r.costoMensual
    porCategoria[cat].costoTotal   += r.costoTotal
  }

  // Overhead y contingencia (sobre costo directo mensual)
  const overheadMensual     = costoDirectoMensual * (overheadPct     / 100)
  const contingenciaMensual = costoDirectoMensual * (contingenciaPct / 100)
  const costoTotalMensual   = costoDirectoMensual + overheadMensual + contingenciaMensual

  // Proyecciones de costo
  const costoTotalAnual     = costoTotalMensual * 12
  const costoTotalProyecto  = costoTotalMensual * plazoMeses

  // Proyecciones de venta
  const ventaAnual          = ventaMensual * 12
  const ventaTotalProyecto  = ventaMensual * plazoMeses

  // Indicadores financieros
  const grossMarginPct =
    ventaMensual > 0
      ? ((ventaMensual - costoTotalMensual) / ventaMensual) * 100
      : 0

  const roiPct =
    costoTotalMensual > 0
      ? ((ventaMensual - costoTotalMensual) / costoTotalMensual) * 100
      : 0

  // Redondear categorías
  for (const cat of Object.keys(porCategoria)) {
    porCategoria[cat].costoMensual = round2(porCategoria[cat].costoMensual)
    porCategoria[cat].costoTotal   = round2(porCategoria[cat].costoTotal)
  }

  return {
    costoDirectoMensual:  round2(costoDirectoMensual),
    costoDirectoTotal:    round2(costoDirectoTotal),
    overheadMensual:      round2(overheadMensual),
    contingenciaMensual:  round2(contingenciaMensual),
    costoTotalMensual:    round2(costoTotalMensual),
    costoTotalAnual:      round2(costoTotalAnual),
    costoTotalProyecto:   round2(costoTotalProyecto),
    ventaMensual:         round2(ventaMensual),
    ventaAnual:           round2(ventaAnual),
    ventaTotalProyecto:   round2(ventaTotalProyecto),
    grossMarginPct:       round2(grossMarginPct),
    roiPct:               round2(roiPct),
    porCategoria,
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Calcula la venta mensual total sumando precio_venta × cantidad
 * de todos los recursos que tienen precio de venta asignado.
 */
export function calcularVentaMensual(
  recursos: Array<{ precioVenta: number | null; cantidad: number }>,
): number {
  return round2(
    recursos.reduce((sum, r) => sum + (r.precioVenta ?? 0) * r.cantidad, 0),
  )
}

/**
 * Color del Gross Margin para indicadores visuales.
 * < 10%  → rojo    (cuidado)
 * 10-25% → ámbar   (aceptable)
 * > 25%  → verde   (bueno)
 */
export function grossMarginColor(pct: number): 'red' | 'amber' | 'green' {
  if (pct < 10) return 'red'
  if (pct < 25) return 'amber'
  return 'green'
}

/**
 * Color del ROI para indicadores visuales.
 * < 15%  → rojo
 * 15-35% → ámbar
 * > 35%  → verde
 */
export function roiColor(pct: number): 'red' | 'amber' | 'green' {
  if (pct < 15) return 'red'
  if (pct < 35) return 'amber'
  return 'green'
}

export const MARGIN_CLASES: Record<ReturnType<typeof grossMarginColor>, string> = {
  red:   'text-red-600',
  amber: 'text-amber-600',
  green: 'text-green-600',
}
