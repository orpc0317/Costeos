/**
 * Constantes globales del proyecto Costeos.
 */

import { UI_THEME } from '@/lib/theme'

// Parámetros por defecto para nuevos costeos
export const DEFAULTS_PARAMETROS = {
  overheadPct: 15,
  margenPct: 20,
  contingenciaPct: 10,
} as const

// Estados de costeos_costeo.estado (TinyInt). El número es el orden del ciclo.
export const ESTADO_COSTEO = {
  BORRADOR: 0,
  AUTORIZAR: 1,
  // Aceptación de parte del cliente.
  ACEPTACION: 2,
  PREPARACION: 3,
  VIGENTE: 4,
  HISTORICO: 5,
  CANCELADO: 6,
} as const

export type EstadoCosteo = (typeof ESTADO_COSTEO)[keyof typeof ESTADO_COSTEO]

export const ESTADO_COSTEO_OPCIONES: { value: EstadoCosteo; label: string }[] = [
  { value: ESTADO_COSTEO.BORRADOR, label: 'Borrador' },
  { value: ESTADO_COSTEO.AUTORIZAR, label: 'Autorizar' },
  { value: ESTADO_COSTEO.ACEPTACION, label: 'Aceptacion' },
  { value: ESTADO_COSTEO.PREPARACION, label: 'Preparacion' },
  { value: ESTADO_COSTEO.VIGENTE, label: 'Vigente' },
  { value: ESTADO_COSTEO.HISTORICO, label: 'Historico' },
  { value: ESTADO_COSTEO.CANCELADO, label: 'Cancelado' },
]

export function labelEstadoCosteo(val: unknown): string {
  const n = Number(val)
  const found = ESTADO_COSTEO_OPCIONES.find(t => t.value === n)
  return found ? found.label : String(val ?? '')
}

export function esBorradorCosteo(val: unknown): boolean {
  return val === ESTADO_COSTEO.BORRADOR
}

// Estados de costeos_contrato.estado. Mismos códigos que el costeo, sin Histórico.
export const ESTADO_CONTRATO = {
  BORRADOR: ESTADO_COSTEO.BORRADOR,
  AUTORIZAR: ESTADO_COSTEO.AUTORIZAR,
  ACEPTACION: ESTADO_COSTEO.ACEPTACION,
  PREPARACION: ESTADO_COSTEO.PREPARACION,
  VIGENTE: ESTADO_COSTEO.VIGENTE,
  CANCELADO: ESTADO_COSTEO.CANCELADO,
} as const

export type EstadoContrato = (typeof ESTADO_CONTRATO)[keyof typeof ESTADO_CONTRATO]

export const ESTADO_CONTRATO_OPCIONES = ESTADO_COSTEO_OPCIONES.filter(
  (opcion): opcion is { value: EstadoContrato; label: string } => opcion.value !== ESTADO_COSTEO.HISTORICO,
)

export function labelEstadoContrato(val: unknown): string {
  const n = Number(val)
  const found = ESTADO_CONTRATO_OPCIONES.find(t => t.value === n)
  return found ? found.label : String(val ?? '')
}

export function claseEstadoCosteo(val: unknown): string {
  switch (Number(val)) {
    case ESTADO_COSTEO.BORRADOR:
      return UI_THEME.badge.warning
    case ESTADO_COSTEO.AUTORIZAR:
      return UI_THEME.badge.info
    case ESTADO_COSTEO.ACEPTACION:
      return UI_THEME.badge.info
    case ESTADO_COSTEO.PREPARACION:
      return UI_THEME.badge.info
    case ESTADO_COSTEO.VIGENTE:
      return UI_THEME.badge.active
    case ESTADO_COSTEO.HISTORICO:
      return UI_THEME.badge.inactive
    case ESTADO_COSTEO.CANCELADO:
      return UI_THEME.badge.danger
    default:
      return UI_THEME.badge.inactive
  }
}

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
