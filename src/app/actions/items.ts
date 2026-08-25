'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { itemSchema, type ItemInput, type ItemRow } from '@/lib/types/items'
import { ItemService } from '@/lib/services/item.service'
import { ItemRepository } from '@/lib/repositories/item.repository'
import { detectarSimilares, type SimilarItem, type SimilarItemConOrigen, type ErpSimilarData } from '@/lib/utils/similarity'
import { erp } from '@/lib/erp'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/items'

export async function listarItems(): Promise<ItemRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ItemService.listar()
}

export async function crearItem(data: ItemInput): Promise<ActionResult<ItemRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ItemService.crear(parsed.data, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function actualizarItem(
  id: number,
  data: ItemInput & { registroVersion: number },
): Promise<ActionResult<ItemRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ItemService.actualizar(id, { ...parsed.data, registroVersion: data.registroVersion }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

/**
 * Retorna true si la empresa tiene sincronización de ITEMS habilitada con el ERP.
 * Determina si el campo Código ERP es editable o read-only en el formulario.
 */
export async function getItemSyncHabilitado(empresaId: number): Promise<boolean> {
  if (!empresaId) return false
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return false
  const config = await prisma.empresaCatalogoSync.findUnique({
    where: { empresaId_catalogo: { empresaId, catalogo: 'ITEMS' } },
  })
  return config?.sincronizar ?? false
}

/**
 * Verifica si la descripción dada es similar a algún item existente de la misma empresa.
 * Solo consulta Costeos. Retorna hasta 5 similares con su % de coincidencia.
 */
export async function buscarItemsSimilares(
  descripcion: string,
  empresaId: number,
  excluirId?: number,
): Promise<SimilarItem[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const todos = await ItemRepository.findAll()
  const deEmpresa = todos
    .filter(i => i.empresaId === empresaId)
    .map(i => ({ id: i.id, descripcion: i.descripcion }))

  return detectarSimilares(descripcion, deEmpresa, 0.85, excluirId)
}

/**
 * Verifica similares en Costeos Y en el ERP (si la empresa tiene sync de Items habilitado).
 *
 * Lógica de merge:
 *  - source='costeos' → existe solo en Costeos
 *  - source='erp'     → existe solo en ERP (mostrar botón "Usar este del ERP")
 *  - source='both'    → existe en Costeos con el mismo codigoErp que el ERP
 *                       (ya sincronizados; se muestra solo como 'costeos', sin vincular)
 *
 * REGLA R18: El scope siempre es por empresa. Ver docs/conventions.md §7.5
 */
export async function buscarItemsSimilaresConERP(
  descripcion: string,
  empresaId: number,
  excluirId?: number,
): Promise<SimilarItemConOrigen[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  // ── 1. Similares en Costeos ────────────────────────────────────────────────
  const todos = await ItemRepository.findAll()
  const deEmpresa = todos
    .filter(i => i.empresaId === empresaId)
    .map(i => ({ id: i.id, descripcion: i.descripcion, codigoErp: i.codigoErp }))

  const similaresCosteos = detectarSimilares(descripcion, deEmpresa, 0.85, excluirId)

  // Mapa codigoErp → item de Costeos (para deduplicar con ERP)
  const codigosErpEnCosteos = new Map<string, number>() // codigoErp → itemId
  for (const item of deEmpresa) {
    if (item.codigoErp) codigosErpEnCosteos.set(item.codigoErp, item.id)
  }

  // Resultado base con source='costeos' + codigoErp para mostrar en tabla
  const resultado: SimilarItemConOrigen[] = similaresCosteos.map(s => {
    const itemOriginal = deEmpresa.find(i => i.id === s.id)
    return {
      ...s,
      source: 'costeos' as const,
      codigoErp: itemOriginal?.codigoErp ?? null,
    }
  })

  // ── 2. Similares en ERP (solo si sync habilitado Y no hay 100% en Costeos) ──
  // Si ya existe un match exacto en Costeos, no tiene sentido ir al ERP.
  const has100EnCosteos = similaresCosteos.some(s => s.pct === 100)

  try {
    const syncConfig = has100EnCosteos
      ? null // corto circuito: no consultar ERP
      : await prisma.empresaCatalogoSync.findUnique({
          where: { empresaId_catalogo: { empresaId, catalogo: 'ITEMS' } },
        })

    if (syncConfig?.sincronizar) {
      // Traer ítems del ERP que coincidan con la búsqueda (el SP ya filtra)
      const erpItems = await erp.getServiciosVenta(empresaId, descripcion)

      // Convertir a formato para detectarSimilares
      const erpParaComparar = erpItems.map((e, idx) => ({
        id: -(idx + 1),           // IDs negativos para no colisionar con Costeos
        descripcion: e.descripcion,
        _original: e,             // guardamos el original para extraer erpData
      }))

      const similaresERP = detectarSimilares(descripcion, erpParaComparar, 0.85)

      for (const simErp of similaresERP) {
        const erpOriginal = erpParaComparar.find(e => e.id === simErp.id)?._original
        if (!erpOriginal) continue

        if (codigosErpEnCosteos.has(erpOriginal.codigo)) {
          // Ya existe en Costeos con ese codigoErp → marcar el de Costeos como 'both'
          const itemIdEnCosteos = codigosErpEnCosteos.get(erpOriginal.codigo)!
          const idx = resultado.findIndex(r => r.id === itemIdEnCosteos)
          if (idx >= 0) resultado[idx] = { ...resultado[idx], source: 'both' }
        } else {
          // No existe en Costeos → agregar como match de ERP con datos para auto-populate
          const erpData: ErpSimilarData = {
            codigo:         erpOriginal.codigo,
            descripcion:    erpOriginal.descripcion,
            unidadMedida:   erpOriginal.unidadMedida,
            tipoItem:       erpOriginal.tipoItem,
            tipoBien:       erpOriginal.tipoBien,
            recurrente:     erpOriginal.recurrente,
            precioVentaCero: erpOriginal.precioVentaCero,
            perfil:         erpOriginal.perfil,
            manejoCostos:   erpOriginal.manejoCostos,
          }
          resultado.push({
            id:          simErp.id,
            descripcion: erpOriginal.descripcion,
            pct:         simErp.pct,
            source:      'erp',
            erpData,
          })
        }
      }
    }
  } catch (erpError) {
    // Si el ERP no responde, continuar solo con Costeos — no bloquear al usuario
    console.error('[buscarItemsSimilaresConERP] ERP no disponible, se omite verificación ERP:', erpError)
  }

  // ── 3. Ordenar y limitar ──────────────────────────────────────────────────
  return resultado
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8) // máximo 8 similares en total
}

