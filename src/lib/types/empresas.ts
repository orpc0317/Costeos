import { z } from 'zod'

// ─── Catálogos disponibles (hardcodeados) ──────────────────────────────────────
// Cada catálogo necesita su propio SP/webservice en el ERP.
// El orden aquí es el orden de visualización en la pestaña ERP.
export const CATALOGOS_ERP = [
  { key: 'CLIENTES', label: 'Clientes' },
  { key: 'ITEMS',    label: 'Items' },
] as const

export type CatalogoKey = typeof CATALOGOS_ERP[number]['key']

export type CatalogoSyncRow = {
  catalogo:    string
  sincronizar: boolean
}

// ─── Schema y tipos de Empresa ────────────────────────────────────────────────
export const empresaSchema = z.object({
  nombre:      z.string().min(1, 'Nombre es requerido').max(100),
  razonSocial: z.string().min(1, 'Razón Social es requerida').max(100),
  nit:         z.string().min(1, 'NIT es requerido').max(20),
  codigoErp:   z.string().max(10).default(''),
})

export type EmpresaInput = z.infer<typeof empresaSchema>

export interface EmpresaRow {
  id:              number
  nombre:          string
  razonSocial:     string
  nit:             string
  codigoErp:       string
  catalogosSync:   CatalogoSyncRow[]
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
}
