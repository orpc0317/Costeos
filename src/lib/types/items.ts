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
  empresaId:       z.coerce.number().min(1, 'Empresa es requerida'),
  descripcion:     z.string().min(1, 'Descripción es requerida').max(100),
  unidadMedida:    z.string().min(1, 'Unidad es requerida').max(10),
  tipoItem:        z.coerce.number().min(1).max(5),
  tipoServicio:    z.coerce.number().min(0).max(1).default(0),
  codigoErp:       z.string().max(15).optional().nullable(),
  categoriaId:     z.coerce.number().min(1, 'Categoría es requerida'),
  precioVentaCero: z.boolean().default(false),
  recurrente:      z.boolean().default(false),
  recurrenteGasto: z.boolean().default(false),
  manejoCostos:    z.coerce.number().default(99),
  tipo:            z.boolean().default(false),
  perfil:          z.boolean().default(false),
  activo:          z.boolean().default(true),
  combos:          z.array(detalleComboSchema).optional(),
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
  id:              number
  empresaId:       number
  empresaNombre?:  string
  descripcion:     string
  unidadMedida:    string
  tipoItem:        number
  tipoServicio:    number
  codigoErp:       string | null
  categoriaId:     number
  categoria?:      { nombre: string }
  precioVentaCero: boolean
  recurrente:      number
  recurrenteGasto: number
  manejoCostos:    number
  tipo:            number
  perfil:          number
  activo:          boolean
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
  combosPrincipal?: DetalleComboRow[]
}



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

