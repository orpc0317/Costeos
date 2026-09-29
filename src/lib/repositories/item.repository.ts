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
      include: {
        combosPrincipal: true,
        tiposComboRH:  { select: { tipoComboRHId: true, rol: true } },
        tiposCombo:    { select: { tipoComboId: true, obligatorio: true } },
      }
    })
  },

  async findById(id: number) {
    return prisma.item.findUnique({ where: { id } })
  },

  async create(
    data: {
      empresaId:             number
      descripcion:           string
      unidadMedida:          string
      tipoItem:              number
      tipoProducto:          number
      venta:                 boolean
      codigoErp?:            string | null
      categoriaId:           number
      tipoComboId?:          number | null
      precioVentaCero:       boolean
      recurrente:            boolean
      recurrenteGasto:       boolean
      manejoCostos:          number
      cotizacionScope?:      string
      porCosteo?:            number
      costoReferenciaItemId?: number | null
      tipo:                  boolean
      perfil:                boolean
      uniforme:              boolean
      activo:                boolean
      combos?:               any[]
      tiposComboRHIds?:      { tipoComboRHId: number; rol: 'NECESITA' | 'DISPONIBLE' }[]
      tiposComboIds?:        { tipoComboId: number; obligatorio: boolean }[]
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { recurrente, recurrenteGasto, tipo, perfil, venta, uniforme, combos, tiposComboRHIds, tiposComboIds, ...rest } = data
    const newItem = await (tx as any).item.create({
      data: {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        venta:           venta           ? 1 : 0,
        uniforme:        uniforme        ? 1 : 0,
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
      include: {
        combosPrincipal: true,
        tiposComboRH:  { select: { tipoComboRHId: true, rol: true } },
        tiposCombo:    { select: { tipoComboId: true, obligatorio: true } },
      }
    })
    // Sync pivot tiposComboRH
    if (tiposComboRHIds && tiposComboRHIds.length > 0) {
      await (tx as any).itemTipoComboRH.createMany({
        data: tiposComboRHIds.map(t => ({ itemId: newItem.id, tipoComboRHId: t.tipoComboRHId, rol: t.rol })),
        skipDuplicates: true,
      })
    }
    // Sync pivot tiposCombo
    if (tiposComboIds && tiposComboIds.length > 0) {
      await (tx as any).itemTipoCombo.createMany({
        data: tiposComboIds.map(t => ({ itemId: newItem.id, tipoComboId: t.tipoComboId, obligatorio: t.obligatorio })),
        skipDuplicates: true,
      })
    }
    return newItem
  },

  async update(
    id: number,
    data: {
      empresaId:             number
      descripcion:           string
      unidadMedida:          string
      tipoItem:              number
      tipoProducto:          number
      venta:                 boolean
      codigoErp?:            string | null
      categoriaId:           number
      tipoComboId?:          number | null
      precioVentaCero:       boolean
      recurrente:            boolean
      recurrenteGasto:       boolean
      manejoCostos:          number
      cotizacionScope?:      string
      porCosteo?:            number
      costoReferenciaItemId?: number | null
      tipo:                  boolean
      perfil:                boolean
      uniforme:              boolean
      activo:                boolean
      registroVersion:       number
      combos?:               any[]
      tiposComboRHIds?:      { tipoComboRHId: number; rol: 'NECESITA' | 'DISPONIBLE' }[]
      tiposComboIds?:        { tipoComboId: number; obligatorio: boolean }[]
    },
    userId: number,
    tx: TxClient = prisma as unknown as TxClient,
  ) {
    const { registroVersion, recurrente, recurrenteGasto, tipo, perfil, venta, uniforme, combos, tiposComboRHIds, tiposComboIds, ...rest } = data
    const result = await (tx as any).item.updateMany({
      where: { id, registroVersion },
      data:  {
        ...rest,
        recurrente:      recurrente      ? 1 : 0,
        recurrenteGasto: recurrenteGasto ? 1 : 0,
        tipo:            tipo            ? 1 : 0,
        perfil:          perfil          ? 1 : 0,
        venta:           venta           ? 1 : 0,
        uniforme:        uniforme        ? 1 : 0,
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

    // Sync pivot tiposComboRH: borrar todos y recrear si se pasaron
    if (tiposComboRHIds !== undefined) {
      await (tx as any).itemTipoComboRH.deleteMany({ where: { itemId: id } })
      if (tiposComboRHIds.length > 0) {
        await (tx as any).itemTipoComboRH.createMany({
          data: tiposComboRHIds.map(t => ({ itemId: id, tipoComboRHId: t.tipoComboRHId, rol: t.rol })),
          skipDuplicates: true,
        })
      }
    }

    // Sync pivot tiposCombo: borrar todos y recrear si se pasaron
    if (tiposComboIds !== undefined) {
      await (tx as any).itemTipoCombo.deleteMany({ where: { itemId: id } })
      if (tiposComboIds.length > 0) {
        await (tx as any).itemTipoCombo.createMany({
          data: tiposComboIds.map(t => ({ itemId: id, tipoComboId: t.tipoComboId, obligatorio: t.obligatorio })),
          skipDuplicates: true,
        })
      }
    }

    return (tx as any).item.findUnique({
      where: { id },
      include: {
        combosPrincipal: true,
        tiposComboRH:  { select: { tipoComboRHId: true, rol: true } },
        tiposCombo:    { select: { tipoComboId: true, obligatorio: true } },
      }
    })
  },
}
