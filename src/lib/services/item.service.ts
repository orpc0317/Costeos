/**
 * item.service.ts — Lógica de negocio para Items.
 *
 * Responsabilidades:
 * - Atomicidad (registro + audit log)
 * - OCC validation (que faltaba en el action original)
 */

import { prisma } from '@/lib/prisma'
import { ItemRepository } from '@/lib/repositories/item.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { ItemInput, ItemRow } from '@/lib/types/items'

const TABLA = 'costeos_item'

export const ItemService = {

  async listar(): Promise<ItemRow[]> {
    const rows = await ItemRepository.findAll()
    return rows.map(r => ({
      ...r,
      empresaNombre: r.empresa?.nombre ?? `Empresa ${r.empresaId}`,
    }))
  },

  async crear(data: ItemInput, userId: number): Promise<ActionResult<ItemRow>> {
    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ItemRepository.create(
        {
          empresaId: data.empresaId,
          descripcion: data.descripcion,
          unidadMedida: data.unidadMedida,
          tipoItem: data.tipoItem,
          tipoServicio: data.tipoServicio,
          codigoErp: data.codigoErp ?? null,
          categoriaId: data.categoriaId,
          precioVentaCero: data.precioVentaCero,
          activo: data.activo ?? true,
        },
        userId,
        tx as any,
      )
      const { categoria: _, empresa: __, ...regSinRelaciones } = reg as any
      await AuditRepository.logCreate(TABLA, reg.id, userId, regSinRelaciones, tx as any)
      return reg
    })

    return { ok: true, data: nuevo as ItemRow }
  },

  async actualizar(id: number, data: ItemInput & { registroVersion: number }, userId: number): Promise<ActionResult<ItemRow>> {
    const anterior = await ItemRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Ítem no encontrado' }

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await ItemRepository.update(
        id,
        {
          empresaId: data.empresaId,
          descripcion: data.descripcion,
          unidadMedida: data.unidadMedida,
          tipoItem: data.tipoItem,
          tipoServicio: data.tipoServicio,
          codigoErp: data.codigoErp ?? null,
          categoriaId: data.categoriaId,
          precioVentaCero: data.precioVentaCero,
          activo: data.activo ?? true,
          registroVersion: data.registroVersion,
        },
        tx as any,
      )
      if (!reg) return null
      const { categoria: _, empresa: __, ...anteriorSinRel } = anterior as any
      const { categoria: _2, empresa: __2, ...regSinRel } = reg as any
      await AuditRepository.logUpdate(TABLA, id, userId, anteriorSinRel, regSinRel, tx as any)
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: actualizado as ItemRow }
  },
}
