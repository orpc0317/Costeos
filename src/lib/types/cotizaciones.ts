// src/lib/types/cotizaciones.ts
// Tipos TypeScript para el módulo de Cotizaciones Compras.

import { z } from 'zod'

// ─── SolicitudCotizacion ──────────────────────────────────────────────────────

export type SolicitudRow = {
  id:              number
  empresaId:       number
  empresaNombre?:  string | null
  itemId:           number
  itemDescripcion:  string
  itemUnidadMedida: string
  costeoId:         number
  cantidad:         number
  clienteNombre?:  string | null
  scope:           string
  estado:          number  // 1=Ingresada, 2=Vigente, 3=Anulada
  fecha:           Date
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
  totalCotizaciones: number
  costoVigente:    number | null  // costoUnitario de la cotización vigente, null si no hay
}

// ─── CotizacionItem ───────────────────────────────────────────────────────────

export const cotizacionItemSchema = z.object({
  solicitudId:  z.coerce.number().min(1),
  proveedorId:  z.coerce.number().min(1, 'Proveedor es requerido'),
  referencia:   z.string().max(100).optional().nullable(),
  fecha:        z.string().min(1, 'Fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  cantidad:     z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  total:        z.coerce.number().positive('El total debe ser mayor a 0'),
  impuestos:    z.coerce.number().int().min(0).max(1).default(0),
  comentario:   z.string().max(15).optional().nullable(),
  archivoUrl:   z.string().optional().nullable(),
  archivoNombre: z.string().max(200).optional().nullable(),
  marcarVigente: z.boolean().default(false),
})

export type CotizacionItemInput = z.infer<typeof cotizacionItemSchema>

export type CotizacionItemRow = {
  id:             number
  solicitudId:    number | null   // null = cotización directa sin solicitud padre
  proveedorId:    number
  proveedorNombre: string
  referencia:     string | null
  fecha:          string        // YYYY-MM-DD
  cantidad:       number
  total:          number
  costoUnitario:  number        // calculado: total / cantidad
  impuestos:      number        // 0 o 1
  comentario:     string | null
  archivoUrl:     string | null
  archivoNombre:  string | null
  vigente:        number        // 0=No, 1=Sí (esta es la cotización vigente)
  estado:         number        // 0=Borrador, 1=Ingresada, 2=Anulada
  usuarioCreo:    number
  fechaCreo:      Date
  registroVersion: number
}

// ─── CotizacionRow (tabla CRUD de Cotizaciones) ──────────────────────────────

/** Fila enriquecida para la pantalla CRUD de Cotizaciones */
export type CotizacionRow = CotizacionItemRow & {
  // Datos del ítem (directos en la cotización o heredados de la solicitud)
  itemId:           number | null
  itemDescripcion:  string | null
  itemUnidadMedida: string | null
  // Datos de la empresa
  empresaId:        number | null
  empresaNombre:    string | null
  // Estado de la solicitud padre (null si no tiene solicitud)
  solicitudEstado:  number | null
  // Cliente y proyecto — solo si viene de un costeo (solicitudId → costeoId > 0)
  clienteNombre:    string | null
  proyectoNombre:   string | null
}

// ─── Schema creación directa ─────────────────────────────────────────────────

export const nuevaCotizacionDirectaSchema = z.object({
  empresaId:     z.coerce.number().min(1, 'Empresa es requerida'),
  itemId:        z.coerce.number().min(1, 'Ítem es requerido'),
  proveedorId:   z.coerce.number().min(1, 'Proveedor es requerido'),
  referencia:    z.string().max(100).optional().nullable(),
  fecha:         z.string().min(1, 'Fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  cantidad:      z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  total:         z.coerce.number().positive('El total debe ser mayor a 0'),
  impuestos:     z.coerce.number().int().min(0).max(1).default(0),
  comentario:    z.string().max(15).optional().nullable(),
  archivoUrl:    z.string().optional().nullable(),
  archivoNombre: z.string().max(200).optional().nullable(),
  marcarVigente: z.boolean().default(true),
})

export type NuevaCotizacionDirectaInput = z.infer<typeof nuevaCotizacionDirectaSchema>
