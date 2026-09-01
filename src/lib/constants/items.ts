/**
 * items.ts — Constantes compartidas para Ítems.
 * Exportadas aquí para poder usarlas en el service (audit) y en el modal (UI).
 */

export const TIPOS_ITEM: { value: string; label: string }[] = [
  { value: '1', label: 'Producto' },
  { value: '2', label: 'Servicio' },
  { value: '3', label: 'Equipo' },
  { value: '4', label: 'Financiero' },
  { value: '5', label: 'Bono' },
]

export const TIPOS_SERVICIO: { value: string; label: string }[] = [
  { value: '0', label: 'Estándar' },
  { value: '1', label: 'Personal' },
]

/** Resuelve un value numérico/string a su label. */
export function labelTipoItem(val: unknown): string {
  const found = TIPOS_ITEM.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}

export function labelTipoServicio(val: unknown): string {
  const found = TIPOS_SERVICIO.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}

export const MANEJO_COSTOS_OPCIONES: { value: string; label: string }[] = [
  { value: '1', label: 'Compras' },
  { value: '2', label: 'Manual' },
  { value: '3', label: 'Referencia' },
  { value: '4', label: 'Solicitar Usuario' },
  { value: '5', label: 'Tabla Item' },
  { value: '99', label: 'No Aplica' },
]

export function labelManejoCostos(val: unknown): string {
  const found = MANEJO_COSTOS_OPCIONES.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}
