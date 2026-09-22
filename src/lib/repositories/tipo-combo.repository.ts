/**
 * tipo-combo.repository.ts — Acceso a datos de la tabla costeos_tipo_combo.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

const SELECT_COMPLETO = {
  id:              true,
  empresaId:       true,
  nombre:          true,
  icono:           true,
  usuarioCreo:     true,
  fechaCreo:       true,
  registroVersion: true,
}

export const TipoComboRepository = {

  async findAll() {
    return prisma.tipoCombo.findMany({
      select: SELECT_COMPLETO,
      orderBy: [{ empresaId: 'asc' }, { nombre: 'asc' }],
    })
  },

  async findById(id: number) {
    return prisma.tipoCombo.findUnique({ where: { id }, select: SELECT_COMPLETO })
  },

  async findByEmpresa(empresaId: number) {
    return prisma.tipoCombo.findMany({
      where: { empresaId },
      select: SELECT_COMPLETO,
      orderBy: { nombre: 'asc' },
    })
  },

  async create(
    data: { empresaId: number; nombre: string; icono?: string | null; usuarioCreo: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).tipoCombo.create({
      data: {
        empresaId:   data.empresaId,
        nombre:      data.nombre,
        icono:       data.icono ?? null,
        usuarioCreo: data.usuarioCreo,
        fechaCreo:   new Date(),
      },
      select: SELECT_COMPLETO,
    })
  },

  async update(
    id: number,
    data: { nombre: string; icono?: string | null; registroVersion: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).tipoCombo.updateMany({
      where: { id, registroVersion },
      data: { ...rest, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC — registro modificado concurrentemente
    return (tx as any).tipoCombo.findUnique({ where: { id }, select: SELECT_COMPLETO })
  },

  async delete(id: number, registroVersion: number, tx: TxClient = prisma as unknown as TxClient) {
    const result = await (tx as any).tipoCombo.deleteMany({
      where: { id, registroVersion },
    })
    return result.count > 0
  },
}
