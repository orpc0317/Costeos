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
import { labelTipoItem, labelTipoProducto, labelManejoCostos } from '@/lib/constants/items'
import type { ActionResult } from '@/lib/types/common'
import type { ItemInput, ItemRow } from '@/lib/types/items'

const TABLA = 'costeos_item'

/** Campos auditables con labels legibles. Solo campos editables por el usuario. */
const CAMPOS_ITEM = [
  { key: 'descripcion',           label: 'Descripción' },
  { key: 'unidadMedida',          label: 'Unidad Medida' },
  { key: 'categoriaId',           label: 'Categoría' },
  { key: 'tipoComboId',           label: 'Tipo Combo' },
  { key: 'tipoItem',              label: 'Tipo Ítem',      transform: labelTipoItem },
  { key: 'tipoProducto',          label: 'Tipo Producto',   transform: (val: unknown, row?: any) => labelTipoProducto(val, row?.tipoItem) },
  { key: 'venta',                 label: 'Venta' },
  { key: 'codigoErp',             label: 'Código ERP' },
  { key: 'precioVentaCero',       label: 'Permitir Precio Cero' },
  { key: 'recurrente',            label: 'Recurrente' },
  { key: 'recurrenteGasto',       label: 'Recurrente Gasto' },
  { key: 'manejoCostos',          label: 'Manejo Costos',  transform: labelManejoCostos },
  { key: 'costoReferenciaItemId', label: 'Item Referencia' },
  { key: 'tipo',                  label: 'Tipo' },
  { key: 'perfil',                label: 'Perfil' },
  { key: 'uniforme',              label: 'Uniforme' },
  { key: 'activo',                label: 'Activo' },
] as const

export const ItemService = {

  async listar(): Promise<ItemRow[]> {
    const [rows, empresas, categorias, tiposCombos, todosItems] = await Promise.all([
      ItemRepository.findAll(),
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
      prisma.categoriaItem.findMany({ select: { id: true, nombre: true } }),
      prisma.tipoCombo.findMany({ select: { id: true, nombre: true } }),
      prisma.item.findMany({ select: { id: true, descripcion: true } }),
    ])
    const empresaMap   = new Map(empresas.map(e  => [e.id, e.nombre]))
    const categoriaMap = new Map(categorias.map(c => [c.id, c.nombre]))
    const tipoComboMap = new Map(tiposCombos.map(t => [t.id, t.nombre]))
    const itemRefMap   = new Map(todosItems.map(i => [i.id, i.descripcion]))
    return rows.map(r => this._serializarItem({
      ...r,
      empresaNombre:              empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
      categoria:                  { nombre: categoriaMap.get(r.categoriaId) ?? String(r.categoriaId) },
      tipoComboNombre:            r.tipoComboId ? (tipoComboMap.get(r.tipoComboId) ?? null) : null,
      costoReferenciaDescripcion: r.costoReferenciaItemId
        ? (itemRefMap.get(r.costoReferenciaItemId) ?? null)
        : null,
    }))
  },

  /** Convierte los campos Decimal de combosPrincipal a number plano. */
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
          empresaId:             data.empresaId,
          descripcion:           data.descripcion,
          unidadMedida:          data.unidadMedida,
          tipoItem:              data.tipoItem,
          tipoProducto:          data.tipoProducto,
          venta:                 data.venta,
          codigoErp:             data.codigoErp ?? null,
          categoriaId:           data.categoriaId,
          tipoComboId:           data.tipoComboId ?? null,
          precioVentaCero:       data.precioVentaCero,
          recurrente:            data.recurrente,
          recurrenteGasto:       data.recurrenteGasto,
          manejoCostos:          data.manejoCostos,
          costoReferenciaItemId: data.manejoCostos === 3 ? (data.costoReferenciaItemId ?? null) : null,
          tipo:                  data.tipo,
          perfil:                data.perfil,
          uniforme:              data.uniforme,
          activo:                data.activo ?? true,
          combos:                data.combos,
          tiposComboRHIds:       data.tiposComboRHIds,
          tiposComboIds:         data.tiposComboIds,
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
    const [anterior, categorias, tiposCombos, todosItems] = await Promise.all([
      ItemRepository.findById(id),
      prisma.categoriaItem.findMany({ where: { empresaId: data.empresaId }, select: { id: true, nombre: true } }),
      prisma.tipoCombo.findMany({ where: { empresaId: data.empresaId }, select: { id: true, nombre: true } }),
      prisma.item.findMany({ select: { id: true, descripcion: true } }),
    ])
    if (!anterior) return { ok: false, error: 'Ítem no encontrado' }

    const categoriaMap = new Map(categorias.map(c => [c.id, c.nombre]))
    const tipoComboMap = new Map(tiposCombos.map(t => [t.id, t.nombre]))
    const itemRefMap   = new Map(todosItems.map(i => [i.id, i.descripcion]))

    // Si manejoCostos cambia a ≠ 3, limpiar referencia
    const esReferencia    = data.manejoCostos === 3
    const nuevoRefItemId  = esReferencia ? (data.costoReferenciaItemId ?? null) : null

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await ItemRepository.update(
        id,
        {
          empresaId:             data.empresaId,
          descripcion:           data.descripcion,
          unidadMedida:          data.unidadMedida,
          tipoItem:              data.tipoItem,
          tipoProducto:          data.tipoProducto,
          venta:                 data.venta,
          codigoErp:             data.codigoErp ?? null,
          categoriaId:           data.categoriaId,
          tipoComboId:           data.tipoComboId ?? null,
          precioVentaCero:       data.precioVentaCero,
          recurrente:            data.recurrente,
          recurrenteGasto:       data.recurrenteGasto,
          manejoCostos:          data.manejoCostos,
          costoReferenciaItemId: nuevoRefItemId,
          tipo:                  data.tipo,
          perfil:                data.perfil,
          uniforme:              data.uniforme,
          activo:                data.activo ?? true,
          registroVersion:       data.registroVersion,
          combos:                data.combos,
          tiposComboRHIds:       data.tiposComboRHIds,
          tiposComboIds:         data.tiposComboIds,
        },
        userId,
        tx as any,
      )
      if (!reg) return null

      // Si el manejo de costos dejó de ser Manual (2), eliminar todos los costos manuales.
      if (data.manejoCostos !== 2 && anterior.manejoCostos === 2) {
        await (tx as any).itemCosto.deleteMany({ where: { itemId: id } })
      }

      // Si el manejo de costos dejó de ser Referencia (3), limpiar historial de pcts.
      if (data.manejoCostos !== 3 && anterior.manejoCostos === 3) {
        await (tx as any).itemCostoRef.deleteMany({ where: { itemId: id } })
      }

      // Resolver IDs a nombres legibles para el diff de auditoría
      const anteriorParaDiff = {
        ...anterior,
        categoriaId:           categoriaMap.get(anterior.categoriaId) ?? anterior.categoriaId,
        tipoComboId:           anterior.tipoComboId
          ? (tipoComboMap.get(anterior.tipoComboId) ?? anterior.tipoComboId)
          : null,
        costoReferenciaItemId: anterior.costoReferenciaItemId
          ? (itemRefMap.get(anterior.costoReferenciaItemId) ?? anterior.costoReferenciaItemId)
          : null,
      }
      const regParaDiff = {
        ...reg,
        categoriaId:           categoriaMap.get(reg.categoriaId) ?? reg.categoriaId,
        tipoComboId:           reg.tipoComboId
          ? (tipoComboMap.get(reg.tipoComboId) ?? reg.tipoComboId)
          : null,
        costoReferenciaItemId: reg.costoReferenciaItemId
          ? (itemRefMap.get(reg.costoReferenciaItemId) ?? reg.costoReferenciaItemId)
          : null,
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
