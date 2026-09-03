/**
 * item-costo.repository.ts — Acceso a datos de costeo_item_costo.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const ItemCostoRepository = {

  /** Lista los costos de un item, ordenados por fecha descendente (el mas reciente primero). */
  async findByItemId(itemId: number) {
    return prisma.itemCosto.findMany({
      where: { itemId },
      orderBy: { fecha: 'desc' },
    })
  },

  /** Obtiene el registro de costo mas reciente (mayor fecha) para un item. */
  async findLatestByItemId(itemId: number) {
    return prisma.itemCosto.findFirst({
      where: { itemId },
      orderBy: { fecha: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.itemCosto.findUnique({ where: { id } })
  },

  async create(
    data: { itemId: number; costo: number; fecha: Date; usuarioId: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).itemCosto.create({ data })
  },

  async delete(
    id: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).itemCosto.delete({ where: { id } })
  },
}
