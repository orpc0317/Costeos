/**
 * item.service.ts — Lógica de negocio para Items.
 *
 * Responsabilidades:
 * - Atomicidad (registro + audit log)
 * - OCC validation
 *
 * ESTÁNDAR FK: Los nombres de empresa/categoría se resuelven vía joins
 * manuales con Promise.all. El repositorio NO usa `include`.
 */

import { prisma } from '@/lib/prisma'
import { ItemRepository } from '@/lib/repositories/item.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import { labelTipoItem, labelTipoServicio, labelManejoCostos } from '@/lib/constants/items'
import type { ActionResult } from '@/lib/types/common'
import type { ItemInput, ItemRow } from '@/lib/types/items'

const TABLA = 'costeos_item'

/** Campos auditables con labels legibles. Solo campos editables por el usuario. */
const CAMPOS_ITEM = [
  { key: 'descripcion',     label: 'Descripción' },
  { key: 'unidadMedida',    label: 'Unidad Medida' },
  { key: 'categoriaId',     label: 'Categoría' },
  { key: 'tipoItem',        label: 'Tipo Ítem',   transform: labelTipoItem },
  { key: 'tipoServicio',    label: 'Tipo Servicio', transform: labelTipoServicio },
  { key: 'codigoErp',       label: 'Código ERP' },
  { key: 'precioVentaCero', label: 'Permitir Precio Cero' },
  { key: 'recurrente',      label: 'Recurrente' },
  { key: 'recurrenteGasto', label: 'Recurrente Gasto' },
  { key: 'manejoCostos',    label: 'Manejo Costos', transform: labelManejoCostos },
  { key: 'tipo',            label: 'Tipo' },
  { key: 'perfil',          label: 'Perfil' },
  { key: 'activo',          label: 'Activo' },
] as const

export const ItemService = {

  async listar(): Promise<ItemRow[]> {
    const [rows, empresas, categorias] = await Promise.all([
      ItemRepository.findAll(),
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
      prisma.categoriaItem.findMany({ select: { id: true, nombre: true } }),
    ])
    const empresaMap  = new Map(empresas.map(e  => [e.id,  e.nombre]))
    const categoriaMap = new Map(categorias.map(c => [c.id, c.nombre]))
    return rows.map(r => this._serializarItem({
      ...r,
      empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
      categoria: { nombre: categoriaMap.get(r.categoriaId) ?? String(r.categoriaId) },
    }))
  },

  /** Convierte los campos Decimal de combosPrincipal a number plano.
   *  Necesario para que los datos sean serializables como props de Client Components. */
  _serializarItem(item: any): ItemRow {
    return {
      ...item,
      combosPrincipal: item.combosPrincipal?.map((c: any) => ({
        ...c,
        nuevoCantidad:      Number(c.nuevoCantidad),
        renovacionCantidad: Number(c.renovacionCantidad),
      })),
    }
  },

  async crear(data: ItemInput, userId: number): Promise<ActionResult<ItemRow>> {
    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ItemRepository.create(
        {
          empresaId:       data.empresaId,
          descripcion:     data.descripcion,
          unidadMedida:    data.unidadMedida,
          tipoItem:        data.tipoItem,
          tipoServicio:    data.tipoServicio,
          codigoErp:       data.codigoErp ?? null,
          categoriaId:     data.categoriaId,
          precioVentaCero: data.precioVentaCero,
          recurrente:      data.recurrente,
          recurrenteGasto: data.recurrenteGasto,
          manejoCostos:    data.manejoCostos,
          tipo:            data.tipo,
          perfil:          data.perfil,
          activo:          data.activo ?? true,
          combos:          data.combos,
        },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, reg as any, tx as any)
      return reg
    })

    return { ok: true, data: this._serializarItem(nuevo) }
  },

  async actualizar(
    id: number,
    data: ItemInput & { registroVersion: number },
    userId: number,
  ): Promise<ActionResult<ItemRow>> {
    const [anterior, categorias] = await Promise.all([
      ItemRepository.findById(id),
      prisma.categoriaItem.findMany({ where: { empresaId: data.empresaId }, select: { id: true, nombre: true } }),
    ])
    if (!anterior) return { ok: false, error: 'Ítem no encontrado' }

    const categoriaMap = new Map(categorias.map(c => [c.id, c.nombre]))

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await ItemRepository.update(
        id,
        {
          empresaId:       data.empresaId,
          descripcion:     data.descripcion,
          unidadMedida:    data.unidadMedida,
          tipoItem:        data.tipoItem,
          tipoServicio:    data.tipoServicio,
          codigoErp:       data.codigoErp ?? null,
          categoriaId:     data.categoriaId,
          precioVentaCero: data.precioVentaCero,
          recurrente:      data.recurrente,
          recurrenteGasto: data.recurrenteGasto,
          manejoCostos:    data.manejoCostos,
          tipo:            data.tipo,
          perfil:          data.perfil,
          activo:          data.activo ?? true,
          registroVersion: data.registroVersion,
          combos:          data.combos,
        },
        userId,
        tx as any,
      )
      if (!reg) return null

      // Resolver categoriaId a nombre legible para el diff de auditoría
      const anteriorParaDiff = {
        ...anterior,
        categoriaId: categoriaMap.get(anterior.categoriaId) ?? anterior.categoriaId,
      }
      const regParaDiff = {
        ...reg,
        categoriaId: categoriaMap.get(reg.categoriaId) ?? reg.categoriaId,
      }

      const { antes, despues } = computeDiff(CAMPOS_ITEM, anteriorParaDiff as any, regParaDiff as any)
      if (Object.keys(antes).length > 0) {
        await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
      }
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: this._serializarItem(actualizado) }
  },
}
