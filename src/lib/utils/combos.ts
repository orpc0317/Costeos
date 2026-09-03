/**
 * Construye recursivamente el árbol de ComboDisponible a partir de los DetalleCombo
 * del catálogo y el array completo de ítems (para resolver nombres e hijos anidados).
 *
 * Se usa tanto en AddNodeDialog (al crear) como en EditorPanel (al cargar desde BD).
 */
import type { ComboDisponible } from '@/lib/types/costeos';
import type { ItemRow, DetalleComboRow } from '@/lib/types/items';

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
        hijos:                secItem.combosPrincipal?.length
          ? buildCombosDisponibles(secItem.combosPrincipal, allItems, costosManuales)
          : undefined,
      } satisfies ComboDisponible;
    })
    .filter(Boolean) as ComboDisponible[];
}
