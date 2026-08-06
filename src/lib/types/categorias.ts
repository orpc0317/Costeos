import { z } from 'zod'

export const categoriaSchema = z.object({
  empresa: z.coerce.number().min(1, 'Empresa es requerida'),
  codigo: z.coerce.number().optional().nullable(),
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
  activo: z.boolean().default(true),
})

export type CategoriaInput = z.infer<typeof categoriaSchema>

export type CategoriaRow = {
  id: number
  empresa: number
  empresaNombre?: string
  codigo: number
  nombre: string
  activo: boolean
  usuarioCreo: number
  fechaCreo: Date
  registroVersion: number
}
