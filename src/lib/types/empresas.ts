import { z } from 'zod'

export const empresaSchema = z.object({
  nombre:              z.string().min(1, 'Nombre es requerido').max(100),
  razonSocial:         z.string().min(1, 'Razón Social es requerida').max(100),
  nit:                 z.string().min(1, 'NIT es requerido').max(20),
  codigoErp:           z.string().max(10).default(''),
  sincronizarItems:    z.boolean().default(false),
  sincronizarCategorias: z.boolean().default(false),
})

export type EmpresaInput = z.infer<typeof empresaSchema>

export interface EmpresaRow {
  id:                   number
  nombre:               string
  razonSocial:          string
  nit:                  string
  codigoErp:            string
  sincronizarItems:     boolean
  sincronizarCategorias: boolean
  usuarioCreo:          number
  fechaCreo:            Date
  registroVersion:      number
}
