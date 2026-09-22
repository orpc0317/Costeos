/**
 * item-costo-ref.repository.ts — Acceso a datos de costeo_item_costo_ref.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const ItemCostoRefRepository = {

  /** Lista los registros de un item, ordenados por fecha descendente (el más reciente primero). */
  async findByItemId(itemId: number) {
    return prisma.itemCostoRef.findMany({
      where: { itemId },
      orderBy: { fecha: 'desc' },
    })
  },

  /** Obtiene el registro más reciente (mayor fecha) para un item. */
  async findLatestByItemId(itemId: number) {
    return prisma.itemCostoRef.findFirst({
      where: { itemId },
      orderBy: { fecha: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.itemCostoRef.findUnique({ where: { id } })
  },

  /** Cuenta los registros de un item — usado para determinar si el ítem referencia es inmutable. */
  async countByItemId(itemId: number): Promise<number> {
    return prisma.itemCostoRef.count({ where: { itemId } })
  },

  async create(
    data: { itemId: number; pct: number; fecha: Date; usuarioId: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).itemCostoRef.create({ data })
  },

  async delete(
    id: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).itemCostoRef.delete({ where: { id } })
  },
}
