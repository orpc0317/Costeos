/**
 * empresa.repository.ts — Acceso a datos de la tabla costeos_empresa.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 * Toda función que modifica datos acepta `tx` opcional para soporte transaccional.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export type EmpresaConSync = {
  id:                   number
  nombre:               string
  razonSocial:          string
  nit:                  string
  codigoErp:            string
  sincronizarItems:     boolean
  sincronizarCategorias: boolean
  usuarioCreo:          number
  fechaCreo:            Date
  registroVersion:      number
}

export const EmpresaRepository = {

  async findAll(): Promise<EmpresaConSync[]> {
    const data = await prisma.empresa.findMany({
      include: { configuracionesSync: true },
      orderBy: { id: 'asc' },
    })
    return data.map((emp) => ({
      id:                   emp.id,
      nombre:               emp.nombre,
      razonSocial:          emp.razonSocial,
      nit:                  emp.nit,
      codigoErp:            String(emp.codigoErp),
      sincronizarItems:     emp.configuracionesSync.find(c => c.catalogo === 'ITEMS')?.sincronizar ?? false,
      sincronizarCategorias: emp.configuracionesSync.find(c => c.catalogo === 'CATEGORIAS')?.sincronizar ?? false,
      usuarioCreo:          emp.usuarioCreo,
      fechaCreo:            emp.fechaCreo,
      registroVersion:      emp.registroVersion,
    }))
  },

  async findById(id: number) {
    return prisma.empresa.findUnique({
      where: { id },
      include: { configuracionesSync: true },
    })
  },

  async create(
    data: { nombre: string; razonSocial: string; nit: string; codigoErp: string; sincronizarItems: boolean; sincronizarCategorias: boolean },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const empresa = await (tx as any).empresa.create({
      data: {
        nombre:      data.nombre,
        razonSocial: data.razonSocial,
        nit:         data.nit,
        codigoErp:   data.codigoErp,
        usuarioCreo: userId,
      },
    })
    await (tx as any).empresaCatalogoSync.createMany({
      data: [
        { empresaId: empresa.id, catalogo: 'ITEMS',      sincronizar: data.sincronizarItems },
        { empresaId: empresa.id, catalogo: 'CATEGORIAS', sincronizar: data.sincronizarCategorias },
      ],
    })
    return empresa
  },

  async update(
    id: number,
    data: { nombre: string; razonSocial: string; nit: string; codigoErp: string; sincronizarItems: boolean; sincronizarCategorias: boolean; registroVersion: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const result = await (tx as any).empresa.updateMany({
      where: { id, registroVersion: data.registroVersion },
      data: {
        nombre:      data.nombre,
        razonSocial: data.razonSocial,
        nit:         data.nit,
        codigoErp:   data.codigoErp,
        registroVersion: { increment: 1 },
      },
    })
    if (result.count === 0) return null // OCC — registro modificado por otro usuario

    await (tx as any).empresaCatalogoSync.upsert({
      where:  { empresaId_catalogo: { empresaId: id, catalogo: 'ITEMS' } },
      update: { sincronizar: data.sincronizarItems },
      create: { empresaId: id, catalogo: 'ITEMS', sincronizar: data.sincronizarItems },
    })
    await (tx as any).empresaCatalogoSync.upsert({
      where:  { empresaId_catalogo: { empresaId: id, catalogo: 'CATEGORIAS' } },
      update: { sincronizar: data.sincronizarCategorias },
      create: { empresaId: id, catalogo: 'CATEGORIAS', sincronizar: data.sincronizarCategorias },
    })
    return (tx as any).empresa.findUnique({ where: { id } })
  },
}
