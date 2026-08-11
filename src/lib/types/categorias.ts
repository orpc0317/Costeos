import { z } from 'zod'

export const categoriaSchema = z.object({
  empresaId: z.coerce.number().min(1, 'Empresa es requerida'),
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
})

export type CategoriaInput = z.infer<typeof categoriaSchema>

export type CategoriaRow = {
  id: number
  empresaId: number
  empresaNombre?: string
  nombre: string
  prioridad: number
  usuarioCreo: number
  fechaCreo: Date
  registroVersion: number
}
