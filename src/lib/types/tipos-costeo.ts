import { z } from 'zod'

// ─── Esquemas Zod ─────────────────────────────────────────────────────────────

export const crearTipoCosteoSchema = z.object({
  empresaId: z.coerce.number().min(1, 'Debe seleccionar una empresa'),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .toUpperCase()
    .trim(),
  nivel1Activo: z.boolean().default(false),
  nivel1Etiqueta: z
    .string()
    .max(50, 'La etiqueta es demasiado larga')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  nivel1ConDireccion: z.boolean().default(false),
  nivel2Activo: z.boolean().default(false),
  nivel2Etiqueta: z
    .string()
    .max(50, 'La etiqueta es demasiado larga')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  lineaEtiqueta: z
    .string()
    .min(1, 'La etiqueta de la línea es requerida')
    .max(50, 'La etiqueta es demasiado larga')
    .toUpperCase()
    .trim(),
  baseEvaluacion: z.enum(['GLOBAL', 'MENSUAL']).default('GLOBAL'),
  manejoPlazo: z.enum(['LIBRE', 'FIJO', 'NO_APLICA']).default('NO_APLICA'),
  fijarPlazo: z.coerce.number().min(0, 'El plazo fijo no puede ser negativo').default(0),
}).refine(data => data.manejoPlazo !== 'FIJO' || data.fijarPlazo > 0, {
  message: "Debe especificar una cantidad de meses mayor a 0",
  path: ["fijarPlazo"],
})

export const editarTipoCosteoSchema = z.object({
  empresaId: z.coerce.number().min(1, 'Debe seleccionar una empresa'),
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'El código es demasiado largo')
    .toUpperCase()
    .trim(),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .toUpperCase()
    .trim(),
  nivel1Activo: z.boolean().default(false),
  nivel1Etiqueta: z
    .string()
    .max(50, 'La etiqueta es demasiado larga')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  nivel1ConDireccion: z.boolean().default(false),
  nivel2Activo: z.boolean().default(false),
  nivel2Etiqueta: z
    .string()
    .max(50, 'La etiqueta es demasiado larga')
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  lineaEtiqueta: z
    .string()
    .min(1, 'La etiqueta de la línea es requerida')
    .max(50, 'La etiqueta es demasiado larga')
    .toUpperCase()
    .trim(),
  baseEvaluacion: z.enum(['GLOBAL', 'MENSUAL']).default('GLOBAL'),
  manejoPlazo: z.enum(['LIBRE', 'FIJO', 'NO_APLICA']).default('NO_APLICA'),
  fijarPlazo: z.coerce.number().min(0, 'El plazo fijo no puede ser negativo').default(0),
  registroVersion: z.coerce.number().min(1, 'La versión de registro es requerida'),
}).refine(data => data.manejoPlazo !== 'FIJO' || data.fijarPlazo > 0, {
  message: "Debe especificar una cantidad de meses mayor a 0",
  path: ["fijarPlazo"],
})

// ─── Tipos derivados ──────────────────────────────────────────────────────────

export type CrearTipoCosteoInput = z.infer<typeof crearTipoCosteoSchema>
export type EditarTipoCosteoInput = z.infer<typeof editarTipoCosteoSchema>

// ─── Tipo de fila en la tabla ─────────────────────────────────────────────────

export type TipoCosteoRow = {
  id: number
  empresaId: number
  empresaNombre?: string
  codigo: string
  nombre: string
  nivel1Activo: boolean
  nivel1Etiqueta: string | null
  nivel1ConDireccion: boolean
  nivel2Activo: boolean
  nivel2Etiqueta: string | null
  lineaEtiqueta: string
  baseEvaluacion: 'GLOBAL' | 'MENSUAL'
  manejoPlazo: 'LIBRE' | 'FIJO' | 'NO_APLICA'
  fijarPlazo: number
  activo: boolean
  creadoEn: Date
  enUso?: boolean
  registroVersion: number
}
