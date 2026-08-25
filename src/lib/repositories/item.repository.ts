/**
 * item.repository.ts — Acceso a datos de la tabla costeos_item.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 * ESTÁNDAR FK: No usar `include` para resolver nombres de FK.
 *              El service hace el join manual vía Promise.all.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export const ItemRepository = {

  async findAll() {
    return prisma.item.findMany({
      orderBy: { descripcion: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.item.findUnique({ where: { id } })
  },

  async create(
    data: {
      empresaId:       number
      descripcion:     string
      unidadMedida:    string
      tipoItem:        number
      tipoServicio:    number
      codigoErp?:      string | null
      categoriaId:     number
      precioVentaCero: boolean
      recurrente:      boolean
      recurrenteGasto: boolean
      manejoCostos:    boolean
      tipo:            boolean
      perfil:          boolean
      activo:          boolean
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { recurrente, recurrenteGasto, manejoCostos, tipo, perfil, ...rest } = data
    return (tx as any).item.create({
      data: {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        manejoCostos:    manejoCostos    ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        usuarioCreo: userId,
      },
    })
  },

  async update(
    id: number,
    data: {
      empresaId:       number
      descripcion:     string
      unidadMedida:    string
      tipoItem:        number
      tipoServicio:    number
      codigoErp?:      string | null
      categoriaId:     number
      precioVentaCero: boolean
      recurrente:      boolean
      recurrenteGasto: boolean
      manejoCostos:    boolean
      tipo:            boolean
      perfil:          boolean
      activo:          boolean
      registroVersion: number
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, recurrente, recurrenteGasto, manejoCostos, tipo, perfil, ...rest } = data
    const result = await (tx as any).item.updateMany({
      where: { id, registroVersion },
      data:  {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        manejoCostos:    manejoCostos    ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        registroVersion: { increment: 1 },
      },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).item.findUnique({ where: { id } })
  },
}
