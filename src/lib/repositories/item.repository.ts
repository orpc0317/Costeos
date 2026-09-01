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
      include: { combosPrincipal: true }
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
      manejoCostos:    number
      tipo:            boolean
      perfil:          boolean
      activo:          boolean
      combos?:         any[]
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { recurrente, recurrenteGasto, tipo, perfil, combos, ...rest } = data
    return (tx as any).item.create({
      data: {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        usuarioCreo: userId,
        combosPrincipal: combos && combos.length > 0 ? {
          create: combos.map((c) => ({
            empresaId: rest.empresaId,
            tipoItem: rest.tipoItem,
            productoSecundarioId: c.productoSecundarioId,
            nuevoCantidad: c.nuevoCantidad,
            nuevoIncluido: c.nuevoIncluido ? 1 : 0,
            nuevoRequerido: c.nuevoRequerido ? 1 : 0,
            renovacionCantidad: c.renovacionCantidad,
            renovacionIncluido: c.renovacionIncluido ? 1 : 0,
            renovacionRequerido: c.renovacionRequerido ? 1 : 0,
            usuarioCreo: userId,
          })),
        } : undefined,
      },
      include: { combosPrincipal: true }
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
      manejoCostos:    number
      tipo:            boolean
      perfil:          boolean
      activo:          boolean
      registroVersion: number
      combos?:         any[]
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, recurrente, recurrenteGasto, tipo, perfil, combos, ...rest } = data
    const result = await (tx as any).item.updateMany({
      where: { id, registroVersion },
      data:  {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        registroVersion: { increment: 1 },
      },
    })
    
    if (result.count === 0) return null // OCC

    // Si pasaron combos, borrar los actuales y recrearlos
    if (combos !== undefined) {
      await (tx as any).detalleCombo.deleteMany({ where: { productoPrincipalId: id } })
      if (combos.length > 0) {
        await (tx as any).detalleCombo.createMany({
          data: combos.map((c) => ({
            empresaId: rest.empresaId,
            tipoItem: rest.tipoItem,
            productoPrincipalId: id,
            productoSecundarioId: c.productoSecundarioId,
            nuevoCantidad: c.nuevoCantidad,
            nuevoIncluido: c.nuevoIncluido ? 1 : 0,
            nuevoRequerido: c.nuevoRequerido ? 1 : 0,
            renovacionCantidad: c.renovacionCantidad,
            renovacionIncluido: c.renovacionIncluido ? 1 : 0,
            renovacionRequerido: c.renovacionRequerido ? 1 : 0,
            usuarioCreo: userId,
          }))
        })
      }
    }

    return (tx as any).item.findUnique({ 
      where: { id },
      include: { combosPrincipal: true }
    })
  },
}
