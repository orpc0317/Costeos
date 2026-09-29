import { z } from 'zod'

// ─── Schema y tipos de Proveedor ──────────────────────────────────────────────

export const proveedorSchema = z.object({
  empresaId: z.number().int().positive(),
  nit:       z.string().min(1, 'NIT es requerido').max(30),
  nombre:    z.string().min(1, 'Nombre es requerido').max(200),
  contacto:  z.string().max(100).optional().nullable(),
  telefono:  z.string().max(45).optional().nullable(),
  email:     z.string().max(100).optional().nullable(),
  codigoErp: z.string().max(15).optional().nullable(),
})

export type ProveedorInput = z.infer<typeof proveedorSchema>

export interface ProveedorRow {
  id:              number
  empresaId:       number
  empresaNombre?:  string
  nit:             string
  nombre:          string
  contacto:        string | null
  telefono:        string | null
  email:           string | null
  codigoErp:       string | null
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
}
