/**
 * item-costo.service.ts — Logica de negocio para costos manuales del item.
 *
 * Regla de integridad cronologica:
 *  - La fecha de un nuevo costo DEBE ser estrictamente mayor que la del ultimo registro.
 *  - Solo se puede eliminar el ultimo registro (el de fecha mas reciente).
 */

import { prisma } from '@/lib/prisma'
import { ItemCostoRepository } from '@/lib/repositories/item-costo.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { ItemCostoInput, ItemCostoRow } from '@/lib/types/items'

const TABLA = 'costeo_item_costo'

/** Convierte un registro de BD a ItemCostoRow (fecha como string YYYY-MM-DD). */
function toRow(r: any, usuarioNombre?: string): ItemCostoRow {
  const fecha = r.fecha instanceof Date ? r.fecha : new Date(r.fecha)
  // Formato YYYY-MM-DD en UTC para evitar desfases de zona horaria
  const fechaStr = fecha.toISOString().slice(0, 10)
  return {
    id:           r.id,
    itemId:       r.itemId,
    costo:        Number(r.costo),
    fecha:        fechaStr,
    fechaAgrego:  r.fechaAgrego,
    usuarioId:    r.usuarioId,
    usuarioNombre,
  }
}

export const ItemCostoService = {

  /** Lista los costos de un item con nombre del usuario que los registro. */
  async listar(itemId: number): Promise<ItemCostoRow[]> {
    const [rows, usuarios] = await Promise.all([
      ItemCostoRepository.findByItemId(itemId),
      prisma.usuario.findMany({ select: { id: true, nombre: true } }),
    ])
    const usuarioMap = new Map(usuarios.map(u => [u.id, u.nombre]))
    return rows.map(r => toRow(r, usuarioMap.get(r.usuarioId)))
  },

  /** Agrega un nuevo costo manual, validando la integridad cronologica. */
  async agregar(
    itemId: number,
    data: ItemCostoInput,
    userId: number,
  ): Promise<ActionResult<ItemCostoRow[]>> {
    // Parsear fecha como UTC para evitar desfases
    const nuevaFecha = new Date(data.fecha + 'T00:00:00.000Z')

    // Validar integridad cronologica
    const ultimo = await ItemCostoRepository.findLatestByItemId(itemId)
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
          error: `La fecha debe ser posterior al ultimo costo registrado (${ultimaFechaStr})`,
          field: 'fecha',
        }
      }
    }

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ItemCostoRepository.create(
        { itemId, costo: data.costo, fecha: nuevaFecha, usuarioId: userId },
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, {
        itemId,
        costo: data.costo,
        fecha: data.fecha,
      }, tx as any)
      return reg
    })

    const lista = await this.listar(itemId)
    return { ok: true, data: lista }
  },

  /** Elimina un costo manual. Solo se puede eliminar el ultimo (fecha mas reciente). */
  async eliminar(
    id: number,
    itemId: number,
    userId: number,
  ): Promise<ActionResult<ItemCostoRow[]>> {
    const [registro, ultimo] = await Promise.all([
      ItemCostoRepository.findById(id),
      ItemCostoRepository.findLatestByItemId(itemId),
    ])

    if (!registro) return { ok: false, error: 'Registro no encontrado' }
    if (!ultimo || ultimo.id !== id) {
      return {
        ok: false,
        error: 'Solo se puede eliminar el ultimo costo registrado para mantener la integridad cronologica',
      }
    }

    await prisma.$transaction(async (tx) => {
      await AuditRepository.logDelete(TABLA, id, userId, {
        itemId: registro.itemId,
        costo:  Number(registro.costo),
        fecha:  (registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha))
                  .toISOString().slice(0, 10),
      }, tx as any)
      await ItemCostoRepository.delete(id, tx as any)
    })

    const lista = await this.listar(itemId)
    return { ok: true, data: lista }
  },
}
