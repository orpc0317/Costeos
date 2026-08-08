/**
 * categoria.repository.ts — Acceso a datos de la tabla costeos_categoria.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const CategoriaRepository = {

  async findAll() {
    return prisma.categoriaItem.findMany({
      include: {
        empresa: { select: { nombre: true } },
      },
      orderBy: { id: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.categoriaItem.findUnique({ where: { id } })
  },

  async findByCodigo(codigo: number) {
    return prisma.categoriaItem.findUnique({ where: { codigo } })
  },

  async findByCodigoExcluding(codigo: number, excludeId: number) {
    return prisma.categoriaItem.findFirst({
      where: { codigo, id: { not: excludeId } },
    })
  },

  async countByEmpresa(empresaId: number): Promise<number> {
    return prisma.categoriaItem.count({ where: { empresaId } })
  },

  async create(
    data: { empresaId: number; codigo: number; nombre: string; prioridad: boolean; activo: boolean },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).categoriaItem.create({
      data: { ...data, usuarioCreo: userId },
    })
  },

  async update(
    id: number,
    data: { empresaId?: number; codigo?: number; nombre: string; prioridad: boolean; activo: boolean; registroVersion: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).categoriaItem.updateMany({
      where: { id, registroVersion },
      data: { ...rest, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).categoriaItem.findUnique({ where: { id } })
  },
}
