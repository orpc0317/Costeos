/**
 * Constantes globales del proyecto Costeos.
 */

// Parámetros por defecto para nuevos costeos
export const DEFAULTS_PARAMETROS = {
  overheadPct: 15,
  margenPct: 20,
  contingenciaPct: 10,
} as const

// Estados de Costeo
export const ESTADO_COSTEO = {
  BORRADOR: 'BORRADOR',
  APROBADO: 'APROBADO',
  CANCELADO: 'CANCELADO',
} as const

export type EstadoCosteo = (typeof ESTADO_COSTEO)[keyof typeof ESTADO_COSTEO]

// Tipos de costeo
export const TIPO_COSTEO = {
  MO_SERVICIOS_PRODUCTOS: 1,
  // Agregar nuevos tipos aquí
} as const

// Límites de validación
export const LIMITES = {
  OVERHEAD_MAX_PCT: 50,
  MARGEN_MAX_PCT: 70,
  CONTINGENCIA_MAX_PCT: 30,
  HORAS_MAX: 99999,
  CANTIDAD_MAX: 999999,
} as const

// Categorías de servicio (hardcoded — se puede migrar a DB después)
export const CATEGORIAS_SERVICIO = [
  'Subcontrato',
  'Consultoría',
  'Transporte y Logística',
  'Instalación',
  'Mantenimiento',
  'Otro',
] as const
