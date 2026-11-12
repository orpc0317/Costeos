const FECHA_VACIA = Date.UTC(1900, 0, 1)

/** Fecha con la que el costeador evalúa costos. La de la versión gana; 1900-01-01 no cuenta. */
export function fechaEvaluacion(costeo?: Date | null, contrato?: Date | null): Date | null {
  if (costeo && costeo.getTime() !== FECHA_VACIA) return costeo
  return contrato ?? null
}

/**
 * Tope para evaluar costos: la fecha de inicio.
 * El registro vigente es el de fecha más reciente que no pasa de ese día.
 */
export function costoHasta(fecha: Date | string | null | undefined): { fecha: { lte: Date } } | Record<string, never> {
  if (!fecha) return {}
  const tope = fecha instanceof Date
    ? new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
    : new Date(`${fecha.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(tope.getTime())) return {}
  return { fecha: { lte: tope } }
}
