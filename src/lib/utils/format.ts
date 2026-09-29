// src/lib/utils/format.ts
// Utilidades de formato para presentación en la UI.

/**
 * Formatea un número como moneda con 2 decimales.
 * Usa el separador de miles y decimales estándar (en-US).
 */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formatea un número para mostrarse en un campo Input disabled (modo vista).
 * - Separador de miles siempre activo
 * - Mínimo `minDecimals` lugares decimales (default 2)
 * - Máximo `maxDecimals` lugares decimales (default 4)
 *
 * USO OBLIGATORIO: toda vez que se muestre un campo numérico en un <Input disabled>
 * en modo vista. Nunca pasar el número crudo al value del Input.
 *
 * Ejemplos:
 *   formatNumber(5)         → "5.00"
 *   formatNumber(1500.25)   → "1,500.25"
 *   formatNumber(3.1416)    → "3.1416"
 *   formatNumber(3.1416, 2, 2) → "3.14"
 */
export function formatNumber(
  value: number | null | undefined,
  minDecimals = 2,
  maxDecimals = 4,
): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value)
}

/**
 * Formatea una fecha ISO o Date a string local legible.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('es-GT')
}
