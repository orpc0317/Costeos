/**
 * item-costo-ref.service.ts — Lógica de negocio para el historial de
 * porcentajes de costo por referencia (manejoCostos = 3).
 *
 * Regla de integridad cronológica:
 *  - La fecha de un nuevo registro DEBE ser estrictamente mayor que la del último.
 *  - Solo se puede eliminar el último registro (el de fecha más reciente).
 */

import { prisma } from '@/lib/prisma'
import { ItemCostoRefRepository } from '@/lib/repositories/item-costo-ref.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { ItemCostoRefInput, ItemCostoRefRow } from '@/lib/types/items'

const TABLA = 'costeo_item_costo_ref'

/** Convierte un registro de BD a ItemCostoRefRow (fecha como string YYYY-MM-DD). */
function toRow(r: any, usuarioNombre?: string): ItemCostoRefRow {
  const fecha = r.fecha instanceof Date ? r.fecha : new Date(r.fecha)
  const fechaStr = fecha.toISOString().slice(0, 10)
  return {
    id:           r.id,
    itemId:       r.itemId,
    pct:          Number(r.pct),
    fecha:        fechaStr,
    fechaAgrego:  r.fechaAgrego,
    usuarioId:    r.usuarioId,
    usuarioNombre,
  }
}

export const ItemCostoRefService = {

  /** Lista los registros de un item con nombre del usuario que los registró. */
  async listar(itemId: number): Promise<ItemCostoRefRow[]> {
    const [rows, usuarios] = await Promise.all([
      ItemCostoRefRepository.findByItemId(itemId),
      prisma.usuario.findMany({ select: { id: true, nombre: true } }),
    ])
    const usuarioMap = new Map(usuarios.map(u => [u.id, u.nombre]))
    return rows.map(r => toRow(r, usuarioMap.get(r.usuarioId)))
  },

  /** Agrega un nuevo registro de porcentaje, validando integridad cronológica. */
  async agregar(
    itemId: number,
    data: ItemCostoRefInput,
    userId: number,
  ): Promise<ActionResult<ItemCostoRefRow[]>> {
    const nuevaFecha = new Date(data.fecha + 'T00:00:00.000Z')

    // Validar integridad cronológica
    const ultimo = await ItemCostoRefRepository.findLatestByItemId(itemId)
    if (ultimo) {
      const ultimaFecha = new Date(
        (ultimo.fecha instanceof Date ? ultimo.fecha : new Date(ultimo.fecha))
          .toISOString()
          .slice(0, 10) + 'T00:00:00.000Z'
      )
      if (nuevaFecha <= ultimaFecha) {
        const ultimaFechaStr = ultimaFecha.toISOString().slice(0, 10)
        return {
          ok: false,
          error: `La fecha debe ser posterior al ultimo registro (${ultimaFechaStr})`,
          field: 'fecha',
        }
      }
    }

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ItemCostoRefRepository.create(
        { itemId, pct: data.pct, fecha: nuevaFecha, usuarioId: userId },
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, {
        itemId,
        pct: data.pct,
        fecha: data.fecha,
      }, tx as any)
      return reg
    })

    const lista = await this.listar(itemId)
    return { ok: true, data: lista }
  },

  /** Elimina un registro. Solo se puede eliminar el último (fecha más reciente). */
  async eliminar(
    id: number,
    itemId: number,
    userId: number,
  ): Promise<ActionResult<ItemCostoRefRow[]>> {
    const [registro, ultimo] = await Promise.all([
      ItemCostoRefRepository.findById(id),
      ItemCostoRefRepository.findLatestByItemId(itemId),
    ])

    if (!registro) return { ok: false, error: 'Registro no encontrado' }
    if (!ultimo || ultimo.id !== id) {
      return {
        ok: false,
        error: 'Solo se puede eliminar el ultimo registro para mantener la integridad cronologica',
      }
    }

    await prisma.$transaction(async (tx) => {
      await AuditRepository.logDelete(TABLA, id, userId, {
        itemId: registro.itemId,
        pct:    Number(registro.pct),
        fecha:  (registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha))
                  .toISOString().slice(0, 10),
      }, tx as any)
      await ItemCostoRefRepository.delete(id, tx as any)
    })

    const lista = await this.listar(itemId)
    return { ok: true, data: lista }
  },
}
