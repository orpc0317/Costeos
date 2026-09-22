/**
 * Construye recursivamente el árbol de ComboDisponible a partir de los DetalleCombo
 * del catálogo y el array completo de ítems (para resolver nombres e hijos anidados).
 *
 * Se usa tanto en AddNodeDialog (al crear) como en EditorPanel (al cargar desde BD).
 */
import type { ComboDisponible, RecursoCosteo } from '@/lib/types/costeos';
import type { ItemRow, DetalleComboRow } from '@/lib/types/items';

/**
 * Fuente de verdad para mapear tipoItem + tipoProducto → categoría del RecursoCosteo.
 *
 * Nueva taxonomía tipo_item (1-6):
 *   1 = Producto          → ARTICULO
 *   2 = Producto Genérico → ARTICULO
 *   3 = Servicio + tipoProducto=1 (Outsourcing) → RECURSO_HUMANO
 *   3 = Servicio + tipoProducto=0 (Estándar)    → SERVICIO
 *   4 = Equipo                                  → EQUIPO
 *   5 = Financiero                              → SERVICIO
 *   6 = Bono                                    → SERVICIO
 */
export function resolveCategoria(
  tipoItem: number | undefined | null,
  tipoProducto: number | undefined | null,
): RecursoCosteo['categoria'] {
  if (tipoItem === 1 || tipoItem === 2) return 'ARTICULO';
  if (tipoItem === 3) return tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO';
  if (tipoItem === 4) return 'EQUIPO';
  return 'SERVICIO'; // 5=Financiero, 6=Bono, fallback
}

export function buildCombosDisponibles(
  combos: DetalleComboRow[],
  allItems: ItemRow[],
  costosManuales: Record<number, number>,
): ComboDisponible[] {
  return combos
    .map(c => {
      const secItem = allItems.find(i => i.id === c.productoSecundarioId);
      if (!secItem) return null;
      return {
        comboId:              c.id,
        productoSecundarioId: c.productoSecundarioId,
        nombre:               secItem.descripcion,
        unidadMedida:         secItem.unidadMedida ?? undefined,
        nuevoCantidad:        Number(c.nuevoCantidad),
        nuevoIncluido:        Number(c.nuevoIncluido),
        nuevoRequerido:       Number(c.nuevoRequerido),
        manejoCostos:         secItem.manejoCostos,
        costosManuales:       secItem.manejoCostos === 2 ? (costosManuales[secItem.id] ?? 0) : undefined,
        tipoItem:             secItem.tipoItem,
        tipoProducto:         secItem.tipoProducto,
        hijos:                secItem.combosPrincipal?.length
          ? buildCombosDisponibles(secItem.combosPrincipal, allItems, costosManuales)
          : undefined,
      } satisfies ComboDisponible;
    })
    .filter(Boolean) as ComboDisponible[];
}
