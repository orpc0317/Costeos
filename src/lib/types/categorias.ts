import { z } from 'zod'

export const categoriaSchema = z.object({
  empresaId: z.coerce.number().min(1, 'Empresa es requerida'),
  codigo: z.coerce.number().optional().nullable(),
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
  prioridad: z.boolean().default(false),
  activo: z.boolean().default(true),
})

export type CategoriaInput = z.infer<typeof categoriaSchema>

export type CategoriaRow = {
  id: number
  empresaId: number
  empresaNombre?: string
  codigo: number
  codigoErp: number
  nombre: string
  prioridad: boolean
  activo: boolean
  usuarioCreo: number
  fechaCreo: Date
  registroVersion: number
}
