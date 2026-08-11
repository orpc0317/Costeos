/**
 * empresa.repository.ts — Acceso a datos de la tabla costeos_empresa.
 *
 * REGLA: Solo queries Prisma. Sin lógica de negocio. Sin auth.
 * Toda función que modifica datos acepta `tx` opcional para soporte transaccional.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { CATALOGOS_ERP, type CatalogoSyncRow } from '@/lib/types/empresas'

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export type EmpresaConSync = {
  id:              number
  nombre:          string
  razonSocial:     string
  nit:             string
  codigoErp:       string
  catalogosSync:   CatalogoSyncRow[]
  usuarioCreo:     number
  fechaCreo:       Date
  registroVersion: number
}

// Claves canónicas de catálogos (para crear al registrar empresa con ERP)
const CLAVES_CATALOGO = CATALOGOS_ERP.map(c => c.key)

export const EmpresaRepository = {

  async findAll(): Promise<EmpresaConSync[]> {
    const data = await prisma.empresa.findMany({
      include: { configuracionesSync: true },
      orderBy: { id: 'asc' },
    })
    return data.map(emp => ({
      id:              emp.id,
      nombre:          emp.nombre,
      razonSocial:     emp.razonSocial,
      nit:             emp.nit,
      codigoErp:       String(emp.codigoErp),
      catalogosSync:   emp.configuracionesSync.map(c => ({
        catalogo:    c.catalogo,
        sincronizar: c.sincronizar,
      })),
      usuarioCreo:     emp.usuarioCreo,
      fechaCreo:       emp.fechaCreo,
      registroVersion: emp.registroVersion,
    }))
  },

  async findById(id: number) {
    return prisma.empresa.findUnique({
      where: { id },
      include: { configuracionesSync: true },
    })
  },

  async create(
    data: { nombre: string; razonSocial: string; nit: string; codigoErp: string },
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

    // Si tiene código ERP, crear entradas de sync para todos los catálogos definidos
    if (data.codigoErp) {
      await (tx as any).empresaCatalogoSync.createMany({
        data: CLAVES_CATALOGO.map(key => ({
          empresaId:   empresa.id,
          catalogo:    key,
          sincronizar: false,
        })),
        skipDuplicates: true,
      })
    }

    return empresa
  },

  async update(
    id: number,
    data: { nombre: string; razonSocial: string; nit: string; codigoErp: string; registroVersion: number },
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const result = await (tx as any).empresa.updateMany({
      where: { id, registroVersion: data.registroVersion },
      data: {
        nombre:          data.nombre,
        razonSocial:     data.razonSocial,
        nit:             data.nit,
        codigoErp:       data.codigoErp,
        registroVersion: { increment: 1 },
      },
    })
    if (result.count === 0) return null // OCC

    // Si ahora tiene código ERP, garantizar que existan todas las entradas de catálogo
    if (data.codigoErp) {
      await (tx as any).empresaCatalogoSync.createMany({
        data: CLAVES_CATALOGO.map(key => ({
          empresaId:   id,
          catalogo:    key,
          sincronizar: false,
        })),
        skipDuplicates: true,
      })
    }

    return (tx as any).empresa.findUnique({ where: { id } })
  },

  /**
   * Actualiza el flag sincronizar de un catálogo específico para una empresa.
   */
  async updateCatalogoSync(
    empresaId: number,
    catalogo: string,
    sincronizar: boolean,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    return (tx as any).empresaCatalogoSync.upsert({
      where:  { empresaId_catalogo: { empresaId, catalogo } },
      update: { sincronizar },
      create: { empresaId, catalogo, sincronizar },
    })
  },
}
