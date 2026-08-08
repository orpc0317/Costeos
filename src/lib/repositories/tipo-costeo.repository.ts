/**
 * tipo-costeo.repository.ts — Acceso a datos de la tabla costeos_tipo_costeo.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient, BaseEvaluacion } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

const SELECT_COMPLETO = {
  id: true,
  empresaId: true,
  codigo: true,
  nombre: true,
  cantidadNiveles: true,
  etiquetasNiveles: true,
  coloresNiveles: true,
  iconosNiveles: true,
  nivelConDireccion: true,
  lineaEtiqueta: true,
  baseEvaluacion: true,
  manejoPlazo: true,
  fijarPlazo: true,
  activo: true,
  creadoEn: true,
  registroVersion: true,
  _count: { select: { costeos: true } },
}

export const TipoCosteoRepository = {

  async findAll() {
    return prisma.tipoCosteo.findMany({
      select: SELECT_COMPLETO,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    })
  },

  async findById(id: number) {
    return prisma.tipoCosteo.findUnique({ where: { id } })
  },

  async findActivos() {
    return prisma.tipoCosteo.findMany({
      where: { activo: true },
      select: {
        id: true, empresaId: true, codigo: true, nombre: true,
        cantidadNiveles: true, etiquetasNiveles: true, nivelConDireccion: true,
        lineaEtiqueta: true, baseEvaluacion: true, manejoPlazo: true,
        fijarPlazo: true, activo: true,
      },
      orderBy: { nombre: 'asc' },
    })
  },

  async findByCodigoAndEmpresa(codigo: string, empresaId: number, excludeId?: number) {
    return prisma.tipoCosteo.findFirst({
      where: {
        empresaId,
        codigo,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
  },

  async countByEmpresa(empresaId: number): Promise<number> {
    return prisma.tipoCosteo.count({ where: { empresaId } })
  },

  async countCosteosAsociados(tipoCosteoId: number): Promise<number> {
    return prisma.costeo.count({ where: { tipoCosteoId } })
  },

  async create(
    data: {
      empresaId: number; codigo: string; nombre: string; cantidadNiveles: number;
      etiquetasNiveles: string; coloresNiveles: string; iconosNiveles: string;
      nivelConDireccion: number; lineaEtiqueta: string;
      baseEvaluacion: BaseEvaluacion; manejoPlazo: string; fijarPlazo: number;
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).tipoCosteo.create({
      data: { ...data, activo: true },
      select: SELECT_COMPLETO,
    })
  },

  async update(
    id: number,
    data: {
      empresaId: number; codigo: string; nombre: string; cantidadNiveles: number;
      etiquetasNiveles: string; coloresNiveles: string; iconosNiveles: string;
      nivelConDireccion: number; lineaEtiqueta: string;
      baseEvaluacion: BaseEvaluacion; manejoPlazo: string; fijarPlazo: number;
      registroVersion: number;
    },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, ...rest } = data
    const result = await (tx as any).tipoCosteo.updateMany({
      where: { id, registroVersion },
      data: { ...rest, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).tipoCosteo.findUnique({ where: { id } })
  },

  async toggleActivo(
    id: number,
    activo: boolean,
    registroVersion: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const result = await (tx as any).tipoCosteo.updateMany({
      where: { id, registroVersion },
      data: { activo: !activo, registroVersion: { increment: 1 } },
    })
    if (result.count === 0) return null // OCC
    return (tx as any).tipoCosteo.findUnique({ where: { id }, select: { activo: true, registroVersion: true } })
  },
}
