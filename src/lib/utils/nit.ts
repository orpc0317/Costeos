/**
 * nit.ts - Utilidades de validacion de NIT guatemalteco (SAT).
 *
 * Modulo 11: el ultimo caracter (digito verificador) se calcula a partir
 * de los digitos anteriores ponderados con factores decrecientes desde
 * (n+1) hasta 2, donde n es la cantidad de digitos base.
 *
 * El digito verificador puede ser 0-9 o la letra K (cuando el resultado es 10).
 */

// ─── Consumidor Final ──────────────────────────────────────────────────────────

/**
 * Detecta si un NIT ingresado corresponde a "Consumidor Final" en cualquiera
 * de sus variantes comunes en Guatemala: CF, C/F, C.F., C.F, CF., C F, etc.
 *
 * Se normaliza eliminando puntos, barras y espacios, y comparando con "CF".
 */
export function isConsumidorFinal(nit: string): boolean {
  const norm = nit.trim().toUpperCase().replace(/[\.\s\/]/g, '')
  return norm === 'CF'
}

/**
 * Normaliza el NIT de Consumidor Final a la forma canonica almacenada en BD: "CF".
 * Si no es Consumidor Final, devuelve el NIT sin modificar (solo trim y uppercase).
 */
export function normalizeNIT(nit: string): string {
  if (isConsumidorFinal(nit)) return 'CF'
  // Quitar guion, espacios y convertir a mayusculas para almacenamiento uniforme.
  // Esto garantiza que "1234567-8" y "12345678" sean equivalentes en BD.
  return nit.trim().toUpperCase().replace(/-/g, '')
}

// ─── Validacion Modulo 11 ──────────────────────────────────────────────────────

export type NITValidationResult =
  | { valid: true }
  | { valid: false; error: string }

/**
 * Valida el digito verificador de un NIT guatemalteco usando el algoritmo
 * Modulo 11 de la SAT.
 *
 * Formatos aceptados:
 *   "1234567-8"   -> con guion
 *   "12345678"    -> sin guion (ultimo caracter = verificador)
 *   "1234567-K"   -> digito verificador K
 *
 * Consumidor Final (CF y variantes) se considera siempre valido.
 *
 * @param nit  NIT tal como lo ingreso el usuario (sin normalizar).
 */
export function validateNIT(nit: string): NITValidationResult {
  const trimmed = nit.trim()

  // CF siempre es valido
  if (isConsumidorFinal(trimmed)) return { valid: true }

  // Quitar espacios internos y convertir a mayusculas
  const clean = trimmed.replace(/\s/g, '').toUpperCase()

  if (!clean) return { valid: false, error: 'El NIT no puede estar vacio' }

  // Separar base y digito verificador
  let base: string
  let checkChar: string

  if (clean.includes('-')) {
    const parts = clean.split('-')
    if (parts.length !== 2) {
      return { valid: false, error: 'Formato de NIT invalido. Ej: 1234567-8 o 1234567-K' }
    }
    base      = parts[0]
    checkChar = parts[1]
  } else {
    // Sin guion: el ultimo caracter es el verificador
    base      = clean.slice(0, -1)
    checkChar = clean.slice(-1)
  }

  // La parte base debe ser solo digitos
  if (!/^\d+$/.test(base) || base.length === 0) {
    return { valid: false, error: 'El NIT solo puede contener digitos y un digito verificador (0-9 o K)' }
  }

  // El verificador debe ser un digito o K
  if (!/^[0-9K]$/.test(checkChar)) {
    return { valid: false, error: 'El digito verificador debe ser un numero o la letra K' }
  }

  // ── Algoritmo Modulo 11 ────────────────────────────────────────────────────
  const n = base.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += parseInt(base[i], 10) * (n + 1 - i)
  }

  const remainder = sum % 11
  let expectedCheck: string
  if (remainder === 0) {
    expectedCheck = '0'
  } else {
    const diff = 11 - remainder
    expectedCheck = diff === 10 ? 'K' : String(diff)
  }

  if (checkChar !== expectedCheck) {
    return {
      valid: false,
      error: 'NIT invalido',
    }
  }

  return { valid: true }
}
