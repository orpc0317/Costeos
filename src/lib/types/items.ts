import { z } from 'zod'

export const detalleComboSchema = z.object({
  id: z.number().optional(),
  productoSecundarioId: z.coerce.number().min(1, 'Item secundario requerido'),
  nuevoCantidad: z.coerce.number().default(0),
  nuevoIncluido: z.boolean().default(false),
  nuevoRequerido: z.boolean().default(false),
  renovacionCantidad: z.coerce.number().default(0),
  renovacionIncluido: z.boolean().default(false),
  renovacionRequerido: z.boolean().default(false),
})

export type DetalleComboInput = z.infer<typeof detalleComboSchema>

export const itemSchema = z.object({
  empresaId:              z.coerce.number().min(1, 'Empresa es requerida'),
  descripcion:            z.string().min(1, 'Descripción es requerida').max(100),
  unidadMedida:           z.string().min(1, 'Unidad es requerida').max(10),
  tipoItem:               z.coerce.number().min(1).max(6),
  tipoProducto:           z.coerce.number().min(0).max(1).default(0),
  venta:                  z.boolean().default(false),
  codigoErp:              z.string().max(15).optional().nullable(),
  categoriaId:            z.coerce.number().min(1, 'Categoría es requerida'),
  precioVentaCero:        z.boolean().default(false),
  recurrente:             z.boolean().default(false),
  recurrenteGasto:        z.boolean().default(false),
  manejoCostos:           z.coerce.number().default(99),
  cotizacionScope:        z.string().default('GENERAL'),
  porCosteo:              z.coerce.number().min(0).max(1).default(0),
  costoReferenciaItemId:  z.coerce.number().nullable().optional(),
  tipo:                   z.boolean().default(false),
  perfil:                 z.boolean().default(false),
  uniforme:               z.boolean().default(false),
  activo:                 z.boolean().default(true),
  combos:                 z.array(detalleComboSchema).optional(),
  tiposComboRHIds:        z.array(z.object({
    tipoComboRHId: z.number(),
    rol: z.enum(['NECESITA', 'DISPONIBLE']),
  })).optional(),
  tipoComboId:            z.coerce.number().nullable().optional(),
  tiposComboIds:          z.array(z.object({
    tipoComboId:  z.number(),
    obligatorio:  z.boolean(),
  })).optional(),
})

export type ItemInput = z.infer<typeof itemSchema>

export type DetalleComboRow = {
  id: number
  empresaId: number
  tipoItem: number
  productoPrincipalId: number
  productoSecundarioId: number
  nuevoCantidad: number
  nuevoIncluido: number
  nuevoRequerido: number
  renovacionCantidad: number
  renovacionIncluido: number
  renovacionRequerido: number
  productoSecundario?: { id: number; descripcion: string; codigoErp: string | null }
}

export type ItemRow = {
  id:                          number
  empresaId:                   number
  empresaNombre?:              string
  descripcion:                 string
  unidadMedida:                string
  tipoItem:                    number
  tipoProducto:                number
  venta:                       number
  codigoErp:                   string | null
  categoriaId:                 number
  categoria?:                  { nombre: string }
  tipoComboId?:                number | null
  tipoComboNombre?:            string | null
  precioVentaCero:             boolean
  recurrente:                  number
  recurrenteGasto:             number
  manejoCostos:                number
  cotizacionScope:             string
  porCosteo:                   number
  costoReferenciaItemId?:      number | null
  costoReferenciaDescripcion?: string | null
  tipo:                        number
  perfil:                      number
  uniforme:                    number
  activo:                      boolean
  usuarioCreo:                 number
  fechaCreo:                   Date
  registroVersion:             number
  combosPrincipal?:            DetalleComboRow[]
  tiposComboRH?:               { tipoComboRHId: number; rol: 'NECESITA' | 'DISPONIBLE' }[]
  tiposCombo?:                 { tipoComboId: number; obligatorio: boolean }[]
}


// ─── Costo Manual (manejoCostos = 2) ─────────────────────────────────────────

export const itemCostoSchema = z.object({
  costo: z.coerce.number().positive('El costo debe ser mayor que 0'),
  fecha: z.string().min(1, 'La fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
})

export type ItemCostoInput = z.infer<typeof itemCostoSchema>

export type ItemCostoRow = {
  id:           number
  itemId:       number
  costo:        number
  fecha:        string   // YYYY-MM-DD (solo fecha, sin hora)
  fechaAgrego:  Date
  usuarioId:    number
  usuarioNombre?: string
}


// ─── Costo Referencia (manejoCostos = 3) ─────────────────────────────────────

export const itemCostoRefSchema = z.object({
  pct:   z.coerce.number().positive('El porcentaje debe ser mayor que 0').max(999.99, 'Máximo 999.99%'),
  fecha: z.string().min(1, 'La fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
})

export type ItemCostoRefInput = z.infer<typeof itemCostoRefSchema>

export type ItemCostoRefRow = {
  id:            number
  itemId:        number
  pct:           number
  fecha:         string   // YYYY-MM-DD
  fechaAgrego:   Date
  usuarioId:     number
  usuarioNombre?: string
}
