// src/lib/constants/cotizaciones.ts
// Constantes para el módulo de Cotizaciones Compras.

export const COTIZACION_SCOPE_OPCIONES: { value: string; label: string }[] = [
  { value: 'GENERAL',       label: 'General' },
  { value: 'POR_PROYECTO',  label: 'Por Proyecto' },
]

export function labelCotizacionScope(val: unknown): string {
  const found = COTIZACION_SCOPE_OPCIONES.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}

// Estados de la SolicitudCotizacion
// 1 = Ingresada  → sin cotización vigente
// 2 = Vigente    → tiene cotización vigente
// 3 = Anulada    → cancelada
export const ESTADO_SOLICITUD_OPCIONES: { value: number; label: string }[] = [
  { value: 1, label: 'Ingresada' },
  { value: 2, label: 'Vigente' },
  { value: 3, label: 'Anulada' },
]

export function labelEstadoSolicitud(val: unknown): string {
  const n = Number(val)
  const found = ESTADO_SOLICITUD_OPCIONES.find(t => t.value === n)
  return found ? found.label : String(val ?? '')
}
