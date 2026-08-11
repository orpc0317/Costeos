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
      orderBy: [
        { prioridad: 'asc' },
        { id: 'asc' },
      ],
    })
  },

  async findById(id: number) {
    return prisma.categoriaItem.findUnique({ where: { id } })
  },

  async findByEmpresa(empresaId: number) {
    return prisma.categoriaItem.findMany({
      where: { empresaId },
      orderBy: [
        { prioridad: 'asc' },
        { id: 'asc' },
      ],
    })
  },

  async findMaxPrioridad(empresaId: number): Promise<number> {
    const result = await prisma.categoriaItem.aggregate({
      where: { empresaId },
      _max: { prioridad: true },
    })
    return result._max.prioridad ?? 0
  },

  async findByNombreYEmpresa(nombre: string, empresaId: number) {
    return prisma.categoriaItem.findFirst({
      where: { nombre, empresaId },
    })
  },

  async findByNombreYEmpresaExcluding(nombre: string, empresaId: number, excludeId: number) {
    return prisma.categoriaItem.findFirst({
      where: { nombre, empresaId, id: { not: excludeId } },
    })
  },

  async create(
    data: { empresaId: number; nombre: string; prioridad: number },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).categoriaItem.create({
      data: { ...data, usuarioCreo: userId },
    })
  },

  async update(
    id: number,
    data: { empresaId?: number; nombre: string; prioridad?: number; registroVersion: number },
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

  /**
   * Batch update de prioridades con OCC.
   * Cada item: { id, prioridad, registroVersion }.
   * Devuelve los IDs que no pudieron actualizarse por conflicto de versión.
   */
  async updatePrioridades(
    actualizaciones: { id: number; prioridad: number; registroVersion: number }[],
    tx: TxClient = prisma as unknown as TxClient,
  ): Promise<{ conflictos: number[] }> {
    const conflictos: number[] = []
    await Promise.all(
      actualizaciones.map(async ({ id, prioridad, registroVersion }) => {
        const result = await (tx as any).categoriaItem.updateMany({
          where: { id, registroVersion },
          data: { prioridad, registroVersion: { increment: 1 } },
        })
        if (result.count === 0) conflictos.push(id)
      }),
    )
    return { conflictos }
  },
}
