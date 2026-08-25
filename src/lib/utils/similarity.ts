/**
 * similarity.ts — Detección de similitud de texto para prevenir duplicados.
 *
 * Combina dos estrategias:
 *   1. Levenshtein sobre el texto original normalizado.
 *   2. Levenshtein sobre el texto SIN stopwords (preposiciones / artículos del español).
 *
 * Se toma el MÁXIMO de ambas similitudes, lo que permite detectar variantes como:
 *   "JEFE DE GRUPO" ≈ "JEFE GRUPO"  →  100% (idénticos sin stopwords)
 *   "JEFE DE GUARDIA" ≈ "JEFE GUARDIA"  →  100%
 *
 * Umbral por defecto: 0.85 (85%).
 *
 * ─── REGLA R18 ───────────────────────────────────────────────────────────────
 * - La comparación SIEMPRE debe hacerse filtrando por empresa ANTES de llamar
 *   a detectarSimilares(). Dos empresas distintas SÍ pueden tener registros
 *   con nombres iguales — eso es válido y NO debe generar advertencia.
 * - La verificación se dispara al GUARDAR el registro, no en onBlur/onChange.
 * - Comportamiento: advertencia no bloqueante. El usuario puede confirmar
 *   con "Sí, guardar de todas formas" o cancelar para corregir el nombre.
 * - Ver docs/conventions.md §7.5 para la implementación estándar completa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { stripDesignacionSocietaria, sanitizeForMatch } from '@/lib/utils/text'

/** Palabras vacías del español que no aportan diferencia semántica */
const STOPWORDS = new Set([
  'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'UN', 'UNA', 'UNOS', 'UNAS',
  'EN', 'Y', 'O', 'A', 'AL', 'CON', 'POR', 'PARA', 'SIN', 'SOBRE',
  'ENTRE', 'DESDE', 'HASTA', 'SE', 'QUE', 'ES', 'SON',
])

/** Elimina stopwords y colapsa espacios múltiples */
export function removeStopwords(text: string): string {
  return text
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOPWORDS.has(w))
    .join(' ')
}

/**
 * Calcula la distancia de Levenshtein entre dos strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/** Similitud Levenshtein normalizada entre 0 y 1 para dos strings ya en mayúsculas */
function simLevenshtein(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  return (maxLen - levenshtein(a, b)) / maxLen
}

/**
 * Retorna un valor entre 0 y 1 indicando el porcentaje de similitud.
 * 1.0 = idénticos, 0.0 = completamente distintos.
 *
 * Compara tanto con el texto original como sin stopwords, devuelve el máximo.
 */
export function similitud(a: string, b: string): number {
  // Sanitizar primero: sin tildes, sin caracteres especiales (&, ', etc.)
  // Solo letras A-Z, números 0-9 y espacios. Evita falsos negativos por
  // caracteres "raros" que el usuario no nota al copiar desde otras fuentes.
  const s1 = sanitizeForMatch(a)
  const s2 = sanitizeForMatch(b)
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0

  // Pasada 1: texto completo sanitizado
  const simOriginal = simLevenshtein(s1, s2)

  // Pasada 2: sin stopwords (preposiciones / artículos)
  const n1 = removeStopwords(s1)
  const n2 = removeStopwords(s2)
  const simNorm = n1 && n2 ? simLevenshtein(n1, n2) : 0

  // Pasada 3: sin designación societaria (S.A., LLC, LTDA, etc.)
  // Permite que "EMPRESA XYZ, S.A." coincida con "EMPRESA XYZ S.R.L."
  const d1 = stripDesignacionSocietaria(s1)
  const d2 = stripDesignacionSocietaria(s2)
  const simSocietario = d1 && d2 ? simLevenshtein(d1, d2) : 0

  // Pasada 4: sin designación societaria Y sin stopwords (combinado)
  // Resuelve casos como "NSP GUATEMALA" vs "NSP DE GUATEMALA, S.A."
  const ds1 = removeStopwords(d1)
  const ds2 = removeStopwords(d2)
  const simCombinado = ds1 && ds2 ? simLevenshtein(ds1, ds2) : 0

  // Pasada 5: prefijo exacto — el texto buscado es prefijo del nombre completo.
  // Cubre búsquedas parciales: "PRINT STUD" → "PRINT STUDIO"
  //   coverage = 10/12 = 83.3%  →  83.3% + 5% = 88.3%  ✅ sobre umbral 85%
  // Requisitos para evitar falsos positivos:
  //   - La cadena más corta tiene ≥ 4 caracteres
  //   - Cubre al menos el 80% del largo de la cadena completa
  const [shorter, longer] = s1.length <= s2.length ? [s1, s2] : [s2, s1]
  const coverage = shorter.length / longer.length
  const simPrefijo = (shorter.length >= 4 && longer.startsWith(shorter) && coverage >= 0.80)
    ? Math.min(1, coverage + 0.05)
    : 0

  return Math.max(simOriginal, simNorm, simSocietario, simCombinado, simPrefijo)
}

export interface SimilarItem {
  id: number
  descripcion: string
  pct: number // Porcentaje de similitud (0-100, redondeado)
}

/**
 * Datos del ERP necesarios para auto-poblar el formulario cuando el usuario
 * selecciona un match del ERP como referencia.
 * Campos mapeados desde ErpServicioVenta.
 */
export interface ErpSimilarData {
  codigo: string      // → codigoErp en Costeos
  descripcion: string // → descripcion
  unidadMedida: string
  tipoItem: number    // → tipoItem
  tipoBien: number    // → tipoServicio
  recurrente: number  // → recurrente (0|1)
  precioVentaCero: number // → precioVentaCero (0|1)
  perfil: number      // → perfil (0|1)
  manejoCostos: number // → manejoCostos (0|1)
}

/**
 * Similar con indicador de origen.
 * source = 'costeos' → solo en Costeos
 * source = 'erp'     → solo en ERP (mostrar botón "Usar este del ERP")
 * source = 'both'    → existe en ambos con el mismo codigoErp (ya sincronizado;
 *                       mostrar solo como Costeos, sin opción de vincular)
 */
export interface SimilarItemConOrigen extends SimilarItem {
  source: 'costeos' | 'erp' | 'both'
  codigoErp?: string | null      // Solo en ítems de Costeos (para mostrar en tabla)
  erpData?: ErpSimilarData       // Solo cuando source = 'erp' | 'both'
}


/**
 * Detecta registros similares al texto dado, comparando contra una lista existente.
 * Excluye el registro con el id indicado (para edición).
 *
 * @param texto      - El texto a comparar (nuevo nombre/descripción)
 * @param existentes - Lista de registros actualmente en la BD
 * @param umbral     - Umbral de similitud para advertir (default: 0.85)
 * @param excluirId  - ID del registro a ignorar (útil al editar)
 */
export function detectarSimilares(
  texto: string,
  existentes: { id: number; descripcion: string }[],
  umbral = 0.85,
  excluirId?: number,
): SimilarItem[] {
  const normalizado = texto.trim().toUpperCase()
  if (!normalizado) return []

  return existentes
    .filter(e => e.id !== excluirId)
    .map(e => ({
      id:          e.id,
      descripcion: e.descripcion,
      pct:         Math.round(similitud(normalizado, e.descripcion) * 100),
    }))
    .filter(e => e.pct >= Math.round(umbral * 100))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5) // Máximo 5 similares a mostrar
}
