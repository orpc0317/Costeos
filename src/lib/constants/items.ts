/**
 * items.ts — Constantes compartidas para Ítems.
 * Exportadas aquí para poder usarlas en el service (audit) y en el modal (UI).
 *
 * Nueva taxonomía tipo_item (1-6):
 *   1 = Producto          → tipo_producto siempre 0 (auto)
 *   2 = Producto Genérico → tipo_producto siempre 1 (auto)
 *   3 = Servicio          → tipo_producto 0=Estándar | 1=Outsourcing (seleccionable)
 *   4 = Equipo            → tipo_producto siempre 1 = Activo (auto)
 *   5 = Financiero        → tipo_producto siempre 0 (auto)
 *   6 = Bono              → tipo_producto siempre 0 (auto)
 */

export const TIPOS_ITEM: { value: string; label: string }[] = [
  { value: '1', label: 'Producto' },
  { value: '2', label: 'Generico' },
  { value: '3', label: 'Servicio' },
  { value: '4', label: 'Equipo' },
  { value: '5', label: 'Financiero' },
  { value: '6', label: 'Bono' },
]

/**
 * Opciones de tipo_producto para tipo_item = 3 (Servicio).
 * Es el ÚNICO tipo_item donde el usuario puede seleccionar tipo_producto.
 * Para todos los demás, el valor se fuerza automáticamente.
 */
export const TIPOS_PRODUCTO_SERVICIO: { value: string; label: string }[] = [
  { value: '0', label: 'Estandar' },
  { value: '1', label: 'Outsourcing' },
]

/**
 * Retorna el valor fijo de tipo_producto para un tipo_item dado.
 * null = el campo es seleccionable por el usuario (solo tipo_item=3).
 */
export function getTipoProductoFijo(tipoItem: string | number): number | null {
  switch (Number(tipoItem)) {
    case 1: return 0  // Producto → siempre Estándar
    case 2: return 1  // Producto Genérico → siempre Producto
    case 3: return null  // Servicio → seleccionable (0=Estándar, 1=Outsourcing)
    case 4: return 1  // Equipo → siempre Activo
    case 5: return 0  // Financiero → siempre 0
    case 6: return 0  // Bono → siempre 0
    default: return 0
  }
}


/** Resuelve un value numérico/string a su label de tipo_item. */
export function labelTipoItem(val: unknown): string {
  const found = TIPOS_ITEM.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}

/** Resuelve tipo_producto a label contextual según tipo_item. */
export function labelTipoProducto(val: unknown, tipoItem?: unknown): string {
  const ti = Number(tipoItem ?? 0)
  const v = String(val ?? '0')
  if (ti === 3) {
    // Servicio: 0=Estándar, 1=Outsourcing
    const found = TIPOS_PRODUCTO_SERVICIO.find(t => t.value === v)
    return found ? found.label : v
  }
  // Para todos los demás, el valor es fijo
  if (v === '0') return 'Estandar'
  if (v === '1') return ti === 2 ? 'Producto' : ti === 4 ? 'Activo' : 'Estandar'
  return v
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

export const COTIZACION_SCOPE_OPCIONES: { value: string; label: string }[] = [
  { value: 'GENERAL',      label: 'General' },
  { value: 'POR_PROYECTO', label: 'Por Proyecto' },
]

export function labelCotizacionScopeItem(val: unknown): string {
  const found = COTIZACION_SCOPE_OPCIONES.find(t => t.value === String(val ?? ''))
  return found ? found.label : String(val ?? '')
}
