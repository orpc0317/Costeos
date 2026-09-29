'use server'

/**
 * costear.ts — Server Action para el proceso de Costear el Proyecto.
 *
 * Resuelve el costoUnitario para cada ítem del árbol según su manejoCostos:
 *   1 = Compras       → busca CotizacionItem vigente (por POR_PROYECTO primero, luego GENERAL)
 *   2 = Manual        → busca el último registro en costeo_item_costo
 *   3 = Referencia    → calcula pct más reciente × costo del ítem de referencia
 *   4 = Solicitar     → el usuario ingresa el costo en el modal (llega como parámetro)
 *   5 = Tabla Item    → misma lógica que Manual (último registro costeo_item_costo)
 *  99 = No Aplica     → costoUnitario = 0 (no toca nada)
 *
 * Devuelve un mapa de itemId → costoResuelto (number) para que el frontend
 * actualice el árbol en el contexto de React.
 *
 * Los ítems tipo "Solicitar" (4) que el usuario NO ingresó costo se quedan en 0.
 * Los ítems tipo "Compras" sin cotización vigente quedan en 0.
 */

import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/lib/types/common'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ItemParaCostear {
  itemId:       number
  manejoCostos: number
  /** Solo para manejoCostos=3: el itemId del ítem de referencia */
  costoReferenciaItemId?: number | null
  /** Solo para manejoCostos=1: scope de cotización (GENERAL | POR_PROYECTO) */
  cotizacionScope?: string
  /** Solo para manejoCostos=1: si=1 solo busca cotización del costeo específico, no cae a GENERAL */
  porCosteo?: number
}

export interface CosteoResuelto {
  /** Mapa itemId → costo unitario resuelto */
  costosResueltos: Record<number, number>
  /** Items que quedaron con costo 0 por falta de datos (Compras sin cotización, etc.) */
  sinCosto: { itemId: number; nombre: string; motivo: string }[]
}

// ─── Acción principal ─────────────────────────────────────────────────────────

/**
 * Resuelve los costos para todos los ítems del proyecto.
 *
 * @param costeoId         ID del costeo (para buscar cotizaciones POR_PROYECTO)
 * @param items            Lista de ítems únicos del árbol con su manejoCostos
 * @param costosSolicitar  Mapa itemId → costo ingresado por el usuario para manejoCostos=4
 */
export async function resolverCostosProyecto(
  costeoId: number,
  items: ItemParaCostear[],
  costosSolicitar: Record<number, number> = {},
): Promise<ActionResult<CosteoResuelto>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const costosResueltos: Record<number, number> = {}
  const sinCosto: { itemId: number; nombre: string; motivo: string }[] = []

  // Obtener nombres de ítems para los reportes de error
  const itemIds = items.map(i => i.itemId)
  const itemsDB = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, descripcion: true, manejoCostos: true, costoReferenciaItemId: true },
  })
  const itemMap = new Map(itemsDB.map(i => [i.id, i]))

  // Recopilar todos los itemIds de referencia que necesitamos (manejoCostos=3)
  const refItemIds: number[] = []
  for (const item of items) {
    if (item.manejoCostos === 3) {
      const ref = item.costoReferenciaItemId
        ?? itemMap.get(item.itemId)?.costoReferenciaItemId
        ?? null
      if (ref) refItemIds.push(ref)
    }
  }

  // ── 1. Cargar últimos costos manuales (manejoCostos 2, 5 + ítems de referencia para 3) ──
  const allItemsNeedingManualCost = [
    ...items.filter(i => i.manejoCostos === 2 || i.manejoCostos === 5).map(i => i.itemId),
    ...refItemIds,
  ]
  const uniqueManualIds = [...new Set(allItemsNeedingManualCost)]

  const ultimosCostosManual: Record<number, number> = {}
  if (uniqueManualIds.length > 0) {
    const costos = await prisma.itemCosto.findMany({
      where: { itemId: { in: uniqueManualIds } },
      orderBy: { fecha: 'desc' },
      select: { itemId: true, costo: true },
    })
    for (const c of costos) {
      if (ultimosCostosManual[c.itemId] === undefined) {
        ultimosCostosManual[c.itemId] = Number(c.costo)
      }
    }
  }

  // ── 2. Cargar últimos porcentajes de referencia (manejoCostos=3) ──
  const itemsReferencia = items.filter(i => i.manejoCostos === 3)
  const ultimosPctRef: Record<number, number> = {}
  if (itemsReferencia.length > 0) {
    const pcts = await prisma.itemCostoRef.findMany({
      where: { itemId: { in: itemsReferencia.map(i => i.itemId) } },
      orderBy: { fecha: 'desc' },
      select: { itemId: true, pct: true },
    })
    for (const p of pcts) {
      if (ultimosPctRef[p.itemId] === undefined) {
        ultimosPctRef[p.itemId] = Number(p.pct)
      }
    }
  }

  // ── 3. Cargar cotizaciones vigentes (manejoCostos=1) ──
  const itemsCompras = items.filter(i => i.manejoCostos === 1)
  // Para cada ítem de Compras, buscar la cotización vigente:
  //   porCosteo=1 → SOLO busca en la solicitud de ESTE costeo específico (sin fallback a GENERAL)
  //   porCosteo=0 → busca POR_PROYECTO primero, luego GENERAL como fallback
  const cotizacionesVigentes: Record<number, number> = {}
  for (const item of itemsCompras) {
    let costoVigente: number | null = null
    const esPorCosteo = (item.porCosteo ?? 0) === 1

    // ── Búsqueda en solicitud del costeo específico ──
    if (costeoId > 0) {
      const cotPorProyecto = await (prisma as any).cotizacionItem.findFirst({
        where: {
          vigente: 1,
          solicitud: { itemId: item.itemId, costeoId },
        },
        select: { cantidad: true, total: true },
      })
      if (cotPorProyecto) {
        const cant = Number(cotPorProyecto.cantidad)
        const tot  = Number(cotPorProyecto.total)
        costoVigente = cant > 0 ? tot / cant : 0
      }
    }

    // ── Fallback a GENERAL — solo si porCosteo=0 ──
    if (costoVigente === null && !esPorCosteo) {
      const cotGeneral = await (prisma as any).cotizacionItem.findFirst({
        where: {
          vigente: 1,
          solicitud: { itemId: item.itemId, costeoId: 0 },
        },
        select: { cantidad: true, total: true },
      })
      if (cotGeneral) {
        const cant = Number(cotGeneral.cantidad)
        const tot  = Number(cotGeneral.total)
        costoVigente = cant > 0 ? tot / cant : 0
      }
    }

    cotizacionesVigentes[item.itemId] = costoVigente ?? 0
  }

  // ── 4. Resolver costo para cada ítem ──────────────────────────────────────
  for (const item of items) {
    const itemDB    = itemMap.get(item.itemId)
    const nombre    = itemDB?.descripcion ?? `Ítem ${item.itemId}`
    const manejo    = item.manejoCostos

    switch (manejo) {
      case 1: { // Compras
        const costo = cotizacionesVigentes[item.itemId] ?? 0
        costosResueltos[item.itemId] = costo
        if (costo === 0) {
          const esPorCosteo = (item.porCosteo ?? 0) === 1
          sinCosto.push({
            itemId: item.itemId,
            nombre,
            motivo: esPorCosteo
              ? 'Sin cotización vigente para este proyecto (requiere cotización por costeo)'
              : 'Sin cotización vigente',
          })
        }
        break
      }

      case 2: // Manual
      case 5: { // Tabla Item — misma lógica que Manual
        const costo = ultimosCostosManual[item.itemId] ?? 0
        costosResueltos[item.itemId] = costo
        if (costo === 0) {
          sinCosto.push({ itemId: item.itemId, nombre, motivo: 'Sin costo manual registrado' })
        }
        break
      }

      case 3: { // Referencia
        const refId = item.costoReferenciaItemId
          ?? itemDB?.costoReferenciaItemId
          ?? null
        if (!refId) {
          costosResueltos[item.itemId] = 0
          sinCosto.push({ itemId: item.itemId, nombre, motivo: 'Sin ítem de referencia configurado' })
          break
        }
        const pct       = ultimosPctRef[item.itemId] ?? 0
        const costoBase = ultimosCostosManual[refId]  ?? 0
        const costo     = (costoBase * pct) / 100
        costosResueltos[item.itemId] = costo
        if (costo === 0) {
          sinCosto.push({
            itemId: item.itemId,
            nombre,
            motivo: costoBase === 0
              ? 'Ítem de referencia sin costo'
              : 'Sin porcentaje de referencia registrado',
          })
        }
        break
      }

      case 4: { // Solicitar Usuario — el usuario ya ingresó el costo en el modal
        const costo = costosSolicitar[item.itemId] ?? 0
        costosResueltos[item.itemId] = costo
        // No se agrega a sinCosto: si el usuario lo dejó en 0 fue una decisión consciente
        break
      }

      case 99: // No Aplica
      default: {
        costosResueltos[item.itemId] = 0
        break
      }
    }
  }

  return {
    ok: true,
    data: { costosResueltos, sinCosto },
  }
}

/**
 * Devuelve la lista de ítems únicos "Solicitar Usuario" (manejoCostos=4)
 * que están en el árbol del costeo y NO tienen costo ya ingresado
 * (costoUnitario === 0 en todos los recursos que los usan).
 *
 * El frontend pasa esta lista para filtrar cuáles necesitan ser solicitados.
 */
export interface ItemSolicitar {
  itemId:   number
  nombre:   string
  cantidad: number   // suma de cantidades de todos los recursos que usan este ítem
}
