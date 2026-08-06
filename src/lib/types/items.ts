import { z } from 'zod'

export const itemSchema = z.object({
  empresa: z.coerce.number().min(1, 'Empresa es requerida'),
  descripcion: z.string().min(1, 'Descripción es requerida').max(100),
  unidadMedida: z.string().min(1, 'Unidad es requerida').max(10),
  tipoItem: z.coerce.number().min(1).max(4),
  tipoServicio: z.coerce.number().min(0).max(1).default(0),
  codigoErp: z.string().max(15).optional().nullable(),
  categoriaId: z.coerce.number().min(1, 'Categoría es requerida'),
  precioVentaCero: z.boolean().default(false),
  activo: z.boolean().default(true),
})

export type ItemInput = z.infer<typeof itemSchema>

export type ItemRow = {
  id: number
  empresa: number
  empresaNombre?: string
  descripcion: string
  unidadMedida: string
  tipoItem: number
  tipoServicio: number
  codigoErp: string | null
  categoriaId: number
  categoria?: { nombre: string }
  precioVentaCero: boolean
  activo: boolean
  usuarioCreo: number
  fechaCreo: Date
  registroVersion: number
}
