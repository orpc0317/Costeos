'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { itemSchema, itemCostoSchema, itemCostoRefSchema, type ItemInput, type ItemRow, type ItemCostoInput, type ItemCostoRow, type ItemCostoRefInput, type ItemCostoRefRow } from '@/lib/types/items'
import { ItemService } from '@/lib/services/item.service'
import { ItemCostoService } from '@/lib/services/item-costo.service'
import { ItemCostoRefService } from '@/lib/services/item-costo-ref.service'
import { ItemCostoRefRepository } from '@/lib/repositories/item-costo-ref.repository'
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
 * Búsqueda LIKE (substring) para el Paso 1 del wizard de nuevo ítem.
 *
 * A diferencia de buscarItemsSimilaresConERP, NO aplica umbral de similitud.
 * Devuelve TODOS los registros cuya descripción contenga el texto buscado:
 *  - Costeos: filtro simple .includes() (case-insensitive)
 *  - ERP:     el SP ya hace LIKE; se devuelven todos sus resultados
 *
 * El campo `pct` se calcula igual que siempre pero solo es informativo.
 * La validación de 85 % / 100 % se aplica en el momento de GUARDAR.
 *
 * REGLA R18: scope siempre por empresa.
 */
export async function buscarItemsLIKEConERP(
  descripcion: string,
  empresaId: number,
  excluirId?: number,
): Promise<SimilarItemConOrigen[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const searchNorm = descripcion.trim().toLowerCase()

  // ── 1. Costeos — filtro LIKE ───────────────────────────────────────────────
  const todos = await ItemRepository.findAll()
  const deEmpresa = todos
    .filter(i => i.empresaId === empresaId)
    .map(i => ({ id: i.id, descripcion: i.descripcion, codigoErp: i.codigoErp }))

  const likeMatchesCosteos = deEmpresa.filter(i =>
    i.id !== excluirId &&
    i.descripcion.toLowerCase().includes(searchNorm)
  )

  // Mapa codigoErp → itemId para deduplicar con ERP
  const codigosErpEnCosteos = new Map<string, number>()
  for (const item of deEmpresa) {
    if (item.codigoErp) codigosErpEnCosteos.set(item.codigoErp, item.id)
  }

  // Calcular pct con umbral=0 → devuelve todos los LIKE con su similitud
  const similaresCosteos = detectarSimilares(descripcion, likeMatchesCosteos, 0, excluirId)
  const resultado: SimilarItemConOrigen[] = similaresCosteos.map(s => {
    const original = likeMatchesCosteos.find(i => i.id === s.id)
    return { ...s, source: 'costeos' as const, codigoErp: original?.codigoErp ?? null }
  })

  // ── 2. ERP (solo si sync habilitado) ──────────────────────────────────────
  try {
    const syncConfig = await prisma.empresaCatalogoSync.findUnique({
      where: { empresaId_catalogo: { empresaId, catalogo: 'ITEMS' } },
    })

    if (syncConfig?.sincronizar) {
      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { codigoErp: true } })
      const codigoErpEmpresa = empresa?.codigoErp ? Number(empresa.codigoErp) : empresaId
      const erpItems = await erp.getServiciosVenta(codigoErpEmpresa, descripcion)

      const erpParaComparar = erpItems.map((e, idx) => ({
        id: -(idx + 1),
        descripcion: e.descripcion,
        _original: e,
      }))

      // umbral=0 → calcular pct de todos para display
      const similaresERP = detectarSimilares(descripcion, erpParaComparar, 0)

      for (const simErp of similaresERP) {
        const erpOriginal = erpParaComparar.find(e => e.id === simErp.id)?._original
        if (!erpOriginal) continue

        if (codigosErpEnCosteos.has(erpOriginal.codigo)) {
          // Ya existe en Costeos con ese codigoErp → marcar como 'both'
          const itemIdEnCosteos = codigosErpEnCosteos.get(erpOriginal.codigo)!
          const idx = resultado.findIndex(r => r.id === itemIdEnCosteos)
          if (idx >= 0) resultado[idx] = { ...resultado[idx], source: 'both' }
        } else {
          const erpData: ErpSimilarData = {
            codigo:          erpOriginal.codigo,
            descripcion:     erpOriginal.descripcion,
            unidadMedida:    erpOriginal.unidadMedida,
            tipoItem:        erpOriginal.tipoItem,
            tipoProducto:    erpOriginal.tipoProducto,
            venta:           erpOriginal.venta,
            recurrente:      erpOriginal.recurrente,
            precioVentaCero: erpOriginal.precioVentaCero,
            perfil:          erpOriginal.perfil,
            manejoCostos:    erpOriginal.manejoCostos,
            uniforme:        erpOriginal.uniforme,
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
    console.error('[buscarItemsLIKEConERP] ERP no disponible, se omite:', erpError)
  }

  // Ordenar por pct desc, máximo 20 resultados
  return resultado.sort((a, b) => b.pct - a.pct).slice(0, 20)
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
      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { codigoErp: true } })
      const codigoErpEmpresa = empresa?.codigoErp ? Number(empresa.codigoErp) : empresaId
      const erpItems = await erp.getServiciosVenta(codigoErpEmpresa, descripcion)

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
            tipoProducto:   erpOriginal.tipoProducto,
            venta:          erpOriginal.venta,
            recurrente:     erpOriginal.recurrente,
            precioVentaCero: erpOriginal.precioVentaCero,
            perfil:         erpOriginal.perfil,
            manejoCostos:   erpOriginal.manejoCostos,
            uniforme:       erpOriginal.uniforme,
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

// ─── Costos manuales del ítem ────────────────────────────────────────────────

export async function listarCostosItem(itemId: number): Promise<ItemCostoRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ItemCostoService.listar(itemId)
}

export async function agregarCostoItem(
  itemId: number,
  data: ItemCostoInput,
): Promise<ActionResult<ItemCostoRow[]>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = itemCostoSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString(),
    }
  }

  return ItemCostoService.agregar(itemId, parsed.data, guard.userId)
}

export async function eliminarCostoItem(
  id: number,
  itemId: number,
): Promise<ActionResult<ItemCostoRow[]>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard
  return ItemCostoService.eliminar(id, itemId, guard.userId)
}

/**
 * Retorna el costo manual más reciente para cada itemId del array dado.
 * Solo incluye ítems que tengan al menos un registro en costeo_item_costo.
 * Clave: itemId, Valor: costo (número).
 */
export async function getCostosUltimosManual(
  itemIds: number[],
): Promise<Record<number, number>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok || itemIds.length === 0) return {}

  // Traer todos los registros de los ítems pedidos, ordenados por fecha DESC
  const costos = await prisma.itemCosto.findMany({
    where: { itemId: { in: itemIds } },
    orderBy: { fecha: 'desc' },
    select: { itemId: true, costo: true },
  })

  // Conservar solo el primero (más reciente) por itemId
  const result: Record<number, number> = {}
  for (const c of costos) {
    if (result[c.itemId] === undefined) {
      result[c.itemId] = Number(c.costo)
    }
  }
  return result
}

// ── Combo: búsqueda unificada Costeos + ERP ───────────────────────────────────

/**
 * Tipo de opción unificada para el select "Agregar Sub-item" en ComboTab.
 * - source='costeos': item ya en BD de Costeos → usar directamente
 * - source='erp':     item solo en ERP → requiere auto-creación al seleccionar
 */
export type ComboItemOpcion = {
  source: 'costeos' | 'erp'
  value: string       // `c:${itemId}` o `e:${codigoErp}`
  label: string       // texto visible en el select
  itemId?: number     // solo si source='costeos'
  manejoCostos?: number
  unidadMedida?: string
  // Datos del ERP para auto-crear el item si source='erp'
  erpCodigo?: string
  erpDescripcion?: string
  erpUnidadMedida?: string
  erpTipoItem?: number
  erpTipoProducto?: number  // tipo_producto del SP (contextual por tipoItem)
  erpVenta?: boolean        // venta del SP
  erpCategoriaId?: number
  erpRecurrente?: boolean
  erpPrecioVentaCero?: boolean
  erpPerfil?: boolean
  erpManejoCostos?: number
  erpUniforme?: boolean
}

/**
 * Busca ítems para el selector "Agregar Sub-item" del ComboTab.
 * - Siempre lista los items de Costeos de la empresa.
 * - Si el sync ERP está habilitado Y hay texto de búsqueda, también busca en ERP.
 * - Deduplicación: si un codigoErp ya existe en Costeos, se descarta la entrada ERP.
 *   Costeos siempre tiene prioridad.
 *
 * @param busqueda  Texto libre del input del SearchableSelect (vacío = solo Costeos)
 * @param empresaId Empresa activa del proyecto
 * @param excluirItemIds IDs a excluir (ej. el propio recurso para evitar circulares)
 */
export async function buscarItemsParaCombo(
  busqueda: string,
  empresaId: number,
  excluirItemIds: number[] = [],
): Promise<ComboItemOpcion[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  // ── 1. Items de Costeos ───────────────────────────────────────────────────
  const todosCosteos = await ItemRepository.findAll()
  const deEmpresa = todosCosteos.filter(
    i => i.empresaId === empresaId && !excluirItemIds.includes(i.id) && i.activo
  )

  // Mapa codigoErp → itemId para deduplicación
  const codigosEnCosteos = new Map<string, number>()
  for (const item of deEmpresa) {
    if (item.codigoErp) codigosEnCosteos.set(item.codigoErp, item.id)
  }

  const opcionesCosteos: ComboItemOpcion[] = deEmpresa.map(i => ({
    source: 'costeos' as const,
    value: `c:${i.id}`,
    label: i.codigoErp ? `${i.codigoErp} - ${i.descripcion}` : i.descripcion,
    itemId: i.id,
    manejoCostos: i.manejoCostos,
    unidadMedida: i.unidadMedida,
  }))

  // ── 2. Items del ERP (solo si sync habilitado y hay texto de búsqueda) ───
  if (!busqueda.trim()) return opcionesCosteos

  const syncConfig = await prisma.empresaCatalogoSync.findUnique({
    where: { empresaId_catalogo: { empresaId, catalogo: 'ITEMS' } },
  })
  if (!syncConfig?.sincronizar) return opcionesCosteos

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { codigoErp: true } })
    const codigoErpEmpresa = empresa?.codigoErp ? Number(empresa.codigoErp) : empresaId
    const erpItems = await erp.getServiciosVenta(codigoErpEmpresa, busqueda)

    const opcionesErp: ComboItemOpcion[] = []
    for (const e of erpItems) {
      // Si ya existe en Costeos con ese código → skip (Costeos tiene prioridad)
      if (codigosEnCosteos.has(e.codigo)) continue

      opcionesErp.push({
        source: 'erp' as const,
        value: `e:${e.codigo}`,
        label: `${e.codigo} - ${e.descripcion} (ERP)`,
        erpCodigo: e.codigo,
        erpDescripcion: e.descripcion,
        erpUnidadMedida: e.unidadMedida,
        erpTipoItem: e.tipoItem,
        erpTipoProducto: e.tipoProducto,   // mapeo directo SP tipo_producto
        erpVenta: e.venta === 1,
        erpCategoriaId: undefined,          // el SP no devuelve categoriaId confiable
        erpRecurrente: e.recurrente === 1,
        erpPrecioVentaCero: e.precioVentaCero === 1,
        erpPerfil: e.perfil === 1,
        erpManejoCostos: e.manejoCostos,
        erpUniforme: e.uniforme === 1,
      })
    }

    return [...opcionesCosteos, ...opcionesErp]
  } catch (err) {
    console.error('[buscarItemsParaCombo] Error consultando ERP:', err)
    return opcionesCosteos
  }
}

/**
 * Auto-crea un item del ERP en la BD de Costeos con auditoría completa.
 * Equivalente a que el usuario lo hubiera creado desde el CRUD de Items.
 *
 * Se llama cuando el usuario selecciona una opción con source='erp' en el
 * ComboTab. Después de esto, el item existe en Costeos y cualquier referencia
 * futura usará el registro de Costeos.
 *
 * @param opcion  La ComboItemOpcion con source='erp' y sus datos del ERP
 * @param empresaId Empresa a la que pertenecerá el nuevo item
 */
export async function autoCrearItemDesdeERP(
  opcion: ComboItemOpcion,
  empresaId: number,
): Promise<ActionResult<ItemRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  if (opcion.source !== 'erp' || !opcion.erpCodigo) {
    return { ok: false, error: 'La opción no es de origen ERP' }
  }

  // Verificar que no exista ya en Costeos con ese codigoErp (doble-check)
  const todos = await ItemRepository.findAll()
  const yaExiste = todos.find(
    i => i.empresaId === empresaId && i.codigoErp === opcion.erpCodigo
  )
  if (yaExiste) {
    // Ya fue creado (carrera de condición): retornar el existente
    return { ok: true, data: yaExiste as unknown as ItemRow }
  }

  // Resolver categoriaId: usar el del ERP si viene, si no usar la primera categoría de la empresa
  let categoriaId = opcion.erpCategoriaId ?? 0
  if (!categoriaId) {
    const primeraCat = await prisma.categoriaItem.findFirst({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
      select: { id: true },
    })
    categoriaId = primeraCat?.id ?? 1
  }

  const unidadMedida = (opcion.erpUnidadMedida ?? 'UND').substring(0, 10)

  const data: ItemInput = {
    empresaId,
    descripcion:     opcion.erpDescripcion ?? opcion.erpCodigo,
    unidadMedida,
    tipoItem:        opcion.erpTipoItem && opcion.erpTipoItem > 0 ? opcion.erpTipoItem : 3, // default Servicio
    tipoProducto:    opcion.erpTipoProducto ?? 0,
    venta:           opcion.erpVenta ?? false,
    codigoErp:       opcion.erpCodigo,
    categoriaId,
    precioVentaCero: opcion.erpPrecioVentaCero ?? false,
    recurrente:      opcion.erpRecurrente ?? false,
    recurrenteGasto: false,
    manejoCostos:    opcion.erpManejoCostos ?? 99,
    cotizacionScope: 'GENERAL',
    porCosteo:       0,
    tipo:            false,
    perfil:          opcion.erpPerfil ?? false,
    uniforme:        opcion.erpUniforme ?? false,
    activo:          true,
  }

  const result = await ItemService.crear(data, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}


// ─── Acciones de Costo Referencia (manejoCostos = 3) ─────────────────────────

/** Lista el historial de porcentajes de un ítem de tipo Referencia. */
export async function listarCostosRefItem(itemId: number): Promise<ItemCostoRefRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ItemCostoRefService.listar(itemId)
}

/** Cuenta los registros de porcentaje para un ítem (para determinar inmutabilidad del ítem de referencia). */
export async function contarCostosRefItem(itemId: number): Promise<number> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return 0
  return ItemCostoRefRepository.countByItemId(itemId)
}

/** Agrega un nuevo registro de porcentaje para un ítem de tipo Referencia. */
export async function agregarCostoRefItem(
  itemId: number,
  rawData: { pct: number | string; fecha: string },
): Promise<ActionResult<ItemCostoRefRow[]>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const parsed = itemCostoRefSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { ok: false, error: firstError.message, field: firstError.path[0] as string }
  }

  return ItemCostoRefService.agregar(itemId, parsed.data, guard.userId)
}

/** Elimina el último registro de porcentaje de un ítem de tipo Referencia. */
export async function eliminarCostoRefItem(
  id: number,
  itemId: number,
): Promise<ActionResult<ItemCostoRefRow[]>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }
  return ItemCostoRefService.eliminar(id, itemId, guard.userId)
}
