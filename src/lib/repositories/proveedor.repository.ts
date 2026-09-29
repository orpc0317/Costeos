/**
 * proveedor.repository.ts — Acceso a datos de la tabla costeos_proveedor.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const ProveedorRepository = {

  async findAll() {
    return prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.proveedor.findUnique({ where: { id } })
  },

  async create(
    data: {
      empresaId: number
      nit:       string
      nombre:    string
      contacto:  string | null
      telefono:  string | null
      email:     string | null
      codigoErp: string | null
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).proveedor.create({
      data: {
        ...data,
        usuarioCreo: userId,
      },
    })
  },

  async update(
    id: number,
    data: {
      nit:             string
      nombre:          string
      contacto:        string | null
      telefono:        string | null
      email:           string | null
      codigoErp:       string | null
      registroVersion: number
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).proveedor.updateMany({
      where: { id, registroVersion },
      data: {
        ...rest,
        registroVersion: { increment: 1 },
      },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).proveedor.findUnique({ where: { id } })
  },
}
