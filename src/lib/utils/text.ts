/**
 * Normaliza un texto convirtiéndolo a mayúsculas y eliminando tildes/diacríticos.
 * Según las convenciones del proyecto, todos los textos ingresados por el usuario
 * deben pasar por esta función para asegurar consistencia en búsquedas.
 * 
 * @param text El texto a normalizar
 * @returns El texto en mayúsculas y sin tildes, o cadena vacía si es null/undefined
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD') // Descompone caracteres con tildes en el caracter y la tilde
    .replace(/[\u0300-\u036f]/g, '') // Elimina las tildes
    .toUpperCase(); // Convierte a mayúsculas
}

/**
 * Sanitiza un texto para comparaciones de similitud:
 * - Quita tildes y diacríticos (á→A, é→E, ñ→N, ü→U…)
 * - Convierte a mayúsculas
 * - Elimina todo carácter que NO sea letra A-Z, número 0-9 o espacio.
 *   Esto incluye &, ', ", -, (, ), @, caracteres invisibles, etc.
 * - Colapsa espacios múltiples
 *
 * Uso: comparación fuzzy de nombres de clientes/empresas donde el usuario
 * puede haber copiado texto desde otras fuentes con caracteres "raros" que
 * visualmente no se distinguen.
 *
 * Ejemplos:
 *   "Téllez & Asociados"  →  "TELLEZ ASOCIADOS"
 *   "O'Brien Corp."       →  "OBRIEN CORP"
 *   "EMPRESA\u00A0S.A."  →  "EMPRESA SA"  (non-breaking space eliminado)
 */
export function sanitizeForMatch(text: string): string {
  return text
    .normalize('NFD')                 // descompone tildes
    .replace(/[\u0300-\u036f]/g, '')  // quita diacríticos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')      // solo letras, números y espacios
    .replace(/\s+/g, ' ')             // colapsa espacios múltiples
    .trim()
}

/**
 * Elimina designaciones societarias de un nombre de empresa para mejorar
 * la comparación de similitud.
 *
 * Cubre las variantes más comunes en Guatemala y Latinoamérica:
 *   "CONSTRUCTORA SOLIDA, S.A."  →  "CONSTRUCTORA SOLIDA"
 *   "SERVICIOS XYZ S.R.L"        →  "SERVICIOS XYZ"
 *   "EMPRESA LTDA"               →  "EMPRESA"
 *
 * El resultado siempre viene normalizado (mayúsculas, sin tildes).
 */
export function stripDesignacionSocietaria(text: string): string {
  const norm = normalizeText(text)

  // Patrones ordenados de más específico a más genérico.
  // Se permite separador , o espacio antes de la designación.
  const PATRONES = [
    // Sociedad de Responsabilidad Limitada (variantes con y sin puntos/espacios)
    /[,\s]+S\.?\s*R\.?\s*L\.?\s*$/,
    /[,\s]+SOCIEDAD\s+DE\s+RESPONSABILIDAD\s+LIMITADA\s*$/,
    // Empresa Individual de Responsabilidad Limitada
    /[,\s]+E\.?\s*I\.?\s*R\.?\s*L\.?\s*$/,
    // Sociedad por Acciones Simplificada
    /[,\s]+S\.?\s*A\.?\s*S\.?\s*$/,
    // Sociedad Anónima (debe ir DESPUÉS de SAS para no cortarla a medias)
    /[,\s]+S\.?\s*A\.?\s*$/,
    /[,\s]+SOCIEDAD\s+ANONIMA\s*$/,
    // Sociedad Civil
    /[,\s]+S\.?\s*C\.?\s*$/,
    // Sociedad de Capital Variable (México)
    /[,\s]+S\.?\s*DE\s+C\.?\s*V\.?\s*$/,
    /[,\s]+S\.?\s*A\.?\s*DE\s+C\.?\s*V\.?\s*$/,
    // Limitada / LTDA
    /[,\s]+LIMITADA\s*$/,
    /[,\s]+LTDA\.?\s*$/,
    // Y Compañía / & Cía
    /[,\s]+Y\s+CIA\.?\s*$/,
    /[,\s]+&\s+CIA\.?\s*$/,
    /[,\s]+CIA\.?\s*$/,
    /[,\s]+COMPANIA\s*$/,
    // LLC — Limited Liability Company (anglosajón, muy común en EE.UU.)
    /[,\s]+L\.?\s*L\.?\s*C\.?\s*$/,
    // Inc / Corp / Ltd / PLC (anglosajones)
    /[,\s]+INC\.?\s*$/,
    /[,\s]+CORP\.?\s*$/,
    /[,\s]+LTD\.?\s*$/,
    /[,\s]+PLC\.?\s*$/,
    // Sociedad Colectiva / Comandita
    /[,\s]+S\.?\s*COM\.?\s*$/,
    /[,\s]+SOCIEDAD\s+COLECTIVA\s*$/,
    /[,\s]+EN\s+COMANDITA\s*$/,
  ]

  let resultado = norm
  for (const patron of PATRONES) {
    resultado = resultado.replace(patron, '')
  }
  return resultado.replace(/[,\.\s]+$/, '').trim()
}
