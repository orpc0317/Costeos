import { z } from 'zod'

export const clienteSchema = z.object({
  empresaId:                z.coerce.number().min(1, 'Empresa es requerida'),
  nit:                      z.string().min(1, 'NIT es requerido').max(30),
  razonSocial:              z.string().min(1, 'Razón Social es requerida').max(200),
  direccionFiscal:          z.string().min(1, 'Dirección Fiscal es requerida').max(150),
  direccionPaisId:          z.coerce.number().default(0),
  direccionDepartamentoId:  z.coerce.number().default(0),
  direccionMunicipioId:     z.coerce.number().default(0),
  diasCredito:              z.coerce.number().min(0).default(0),
  codigoErp:                z.string().max(15).optional().nullable(),
})

export type ClienteInput = z.infer<typeof clienteSchema>

export type ClienteRow = {
  id:                      number
  empresaId:               number
  empresaNombre?:          string
  nit:                     string
  razonSocial:             string
  direccionFiscal:         string | null
  direccionPaisId:         number
  direccionDepartamentoId: number
  direccionMunicipioId:    number
  diasCredito:             number
  codigoErp:               string | null
  codigoTemp:              string | null
  usuarioCreo:             number
  fechaCreo:               Date
  registroVersion:         number
}
