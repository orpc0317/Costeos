/**
 * items.ts — Constantes compartidas para Ítems.
 * Exportadas aquí para poder usarlas en el service (audit) y en el modal (UI).
 */

export const TIPOS_ITEM: { value: string; label: string }[] = [
  { value: '1', label: 'PRODUCTO' },
  { value: '2', label: 'SERVICIO' },
  { value: '3', label: 'EQUIPO' },
  { value: '4', label: 'FINANCIERO' },
]

export const TIPOS_SERVICIO: { value: string; label: string }[] = [
  { value: '0', label: 'ESTANDAR' },
  { value: '1', label: 'PERSONAL' },
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
