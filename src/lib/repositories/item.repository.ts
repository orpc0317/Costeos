/**
 * item.repository.ts — Acceso a datos de la tabla costeos_item.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

const INCLUDE_CATEGORIA = {
  categoria: { select: { nombre: true } },
  empresa: { select: { nombre: true } },
}

export const ItemRepository = {

  async findAll() {
    return prisma.item.findMany({
      include: INCLUDE_CATEGORIA,
      orderBy: { descripcion: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.item.findUnique({
      where: { id },
      include: INCLUDE_CATEGORIA,
    })
  },

  async create(
    data: {
      empresaId: number; descripcion: string; unidadMedida: string;
      tipoItem: number; tipoServicio: number; codigoErp?: string | null;
      categoriaId: number; precioVentaCero: boolean; activo: boolean;
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).item.create({
      data: { ...data, usuarioCreo: userId },
      include: INCLUDE_CATEGORIA,
    })
  },

  async update(
    id: number,
    data: {
      empresaId: number; descripcion: string; unidadMedida: string;
      tipoItem: number; tipoServicio: number; codigoErp?: string | null;
      categoriaId: number; precioVentaCero: boolean; activo: boolean;
      registroVersion: number;
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).item.updateMany({
      where: { id, registroVersion },
      data: { ...rest, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).item.findUnique({ where: { id }, include: INCLUDE_CATEGORIA })
  },
}
