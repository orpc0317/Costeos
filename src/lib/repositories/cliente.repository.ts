/**
 * cliente.repository.ts — Acceso a datos de la tabla costeos_cliente.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const ClienteRepository = {

  async findAll() {
    return prisma.cliente.findMany({
      orderBy: { razonSocial: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.cliente.findUnique({ where: { id } })
  },


  async create(
    data: {
      empresaId:               number
      nit:                     string
      razonSocial:             string
      direccionFiscal:         string | null
      direccionPaisId:         number
      direccionDepartamentoId: number
      direccionMunicipioId:    number
      diasCredito:             number
      codigoErp:               string | null
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).cliente.create({
      data: {
        ...data,
        usuarioCreo: userId,
      },
    })
  },

  async update(
    id: number,
    data: {
      nit:                     string
      razonSocial:             string
      direccionFiscal:         string | null
      direccionPaisId:         number
      direccionDepartamentoId: number
      direccionMunicipioId:    number
      diasCredito:             number
      codigoErp:               string | null
      registroVersion:         number
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).cliente.updateMany({
      where: { id, registroVersion },
      data: {
        ...rest,
        registroVersion: { increment: 1 },
      },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).cliente.findUnique({ where: { id } })
  },
}
