import { z } from 'zod'

export const itemSchema = z.object({
  empresaId:       z.coerce.number().min(1, 'Empresa es requerida'),
  descripcion:     z.string().min(1, 'Descripción es requerida').max(100),
  unidadMedida:    z.string().min(1, 'Unidad es requerida').max(10),
  tipoItem:        z.coerce.number().min(1).max(4),
  tipoServicio:    z.coerce.number().min(0).max(1).default(0),
  codigoErp:       z.string().max(15).optional().nullable(),
  categoriaId:     z.coerce.number().min(1, 'Categoría es requerida'),
  precioVentaCero: z.boolean().default(false),
  recurrente:      z.boolean().default(false),
  recurrenteGasto: z.boolean().default(false),
  manejoCostos:    z.boolean().default(false),
  tipo:            z.boolean().default(false),
  perfil:          z.boolean().default(false),
  activo:          z.boolean().default(true),
})

export type ItemInput = z.infer<typeof itemSchema>

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
}
