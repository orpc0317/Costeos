/**
 * audit.ts — Utilidades para generar diffs semánticos en el log de auditoría.
 *
 * LINEAMIENTO: Todo `AuditRepository.logUpdate` debe usar `computeDiff` para:
 * 1. Registrar SOLO los campos que cambiaron (no el objeto completo).
 * 2. Usar labels legibles como claves (no nombres técnicos de columnas BD).
 * 3. Formatear valores booleanos como "Sí"/"No".
 *
 * Ejemplo de resultado en el historial:
 *   ✅ "NIT: 12345 → 67890 | Razón Social: ABC → XYZ"
 *   ❌ "nit: 12345 → 67890 | razonSocial: ABC → XYZ | registroVersion: 1 → 2"
 */

type CampoMap<T> = readonly { key: keyof T; label: string }[]

/**
 * Calcula el diff entre dos versiones de un objeto.
 * Devuelve solo los campos que realmente cambiaron, usando labels legibles como claves
 * y formateando booleanos como "Sí"/"No".
 *
 * @param campos  Mapeo de { key: keyof T, label: string } — define qué campos comparar y cómo etiquetarlos
 * @param anterior Objeto con los valores antes del cambio
 * @param nuevo    Objeto con los valores después del cambio
 * @returns { antes, despues } — solo los campos que cambiaron. Si no hay cambios, ambos son `{}`.
 */
export function computeDiff<T extends Record<string, unknown>>(
  campos: CampoMap<T>,
  anterior: T,
  nuevo: T,
): { antes: Record<string, unknown>; despues: Record<string, unknown> } {
  const antes:   Record<string, unknown> = {}
  const despues: Record<string, unknown> = {}

  for (const { key, label } of campos) {
    const valAntes   = anterior[key]
    const valDespues = nuevo[key]
    if (String(valAntes ?? '') !== String(valDespues ?? '')) {
      antes[label]   = formatAuditValue(valAntes)
      despues[label] = formatAuditValue(valDespues)
    }
  }

  return { antes, despues }
}

/** Formatea un valor individual para el log de auditoría. */
function formatAuditValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return value
}
