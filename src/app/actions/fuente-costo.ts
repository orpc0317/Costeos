'use server'

/**
 * fuente-costo.ts — Server Action para obtener la fuente/referencia de costo
 * de un ítem dentro de un costeo.
 *
 * Devuelve la información de DÓNDE viene el costo del ítem:
 *   1 = Compras       → cotización vigente (proveedor, fecha, monto)
 *   2 = Manual        → último registro de costeo_item_costo (fecha, monto)
 *   3 = Referencia    → ítem de referencia + % más reciente + costo calculado
 *   4 = Solicitar     → ingresado por usuario durante el Costeo
 *   5 = Tabla Item    → mismo que Manual
 *  99 = No Aplica     → sin fuente
 *   0 = Sin definir   → sin fuente
 */

import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export interface FuenteCostoInfo {
  manejoCostos: number
  /** Label visible: "Compras", "Manual", "Referencia", etc. */
  label: string
  /** Solo para manejoCostos=1: si el ítem requiere cotización por costeo específico */
  porCosteo?: number

  // Solo para manejoCostos = 1 (Compras)
  compras?: {
    proveedorId:   number
    proveedorNombre: string
    referencia:    string | null
    fecha:         string          // YYYY-MM-DD
    cantidad:      number
    total:         number
    costoUnitario: number
    impuestos:     number          // 0=sin impuestos, 1=con impuestos
    archivoUrl?:   string | null
  } | null

  // Solo para manejoCostos = 2 o 5 (Manual / Tabla Item)
  manual?: {
    fecha:         string
    costo:         number
    usuarioNombre: string | null
  } | null

  // Solo para manejoCostos = 3 (Referencia)
  referencia?: {
    itemReferenciaId:   number
    itemReferenciaNombre: string
    pct:                number
    costoBase:          number
    costoCalculado:     number
    fechaPct:           string
  } | null
}

const LABEL_MAP: Record<number, string> = {
  1:  'Compras',
  2:  'Manual',
  3:  'Referencia',
  4:  'Solicitado',
  5:  'Tabla Ítem',
  99: 'No Aplica',
}

/**
 * Obtiene la fuente de costo de un ítem para un costeo dado.
 *
 * @param itemId   ID del ítem en la BD local
 * @param costeoId ID del costeo (para buscar cotizaciones POR_PROYECTO)
 */
export async function getFuenteCosto(
  itemId:   number,
  costeoId: number,
): Promise<FuenteCostoInfo | null> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return null

  // Obtener datos del ítem
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      manejoCostos:          true,
      costoReferenciaItemId: true,
      porCosteo:             true,
    },
  })
  if (!item) return null

  const manejo      = item.manejoCostos
  const label       = LABEL_MAP[manejo] ?? 'Sin definir'
  const esPorCosteo = (item.porCosteo ?? 0) === 1

  // ── No Aplica ─────────────────────────────────────────────────────────────
  if (manejo === 99 || manejo === 0) {
    return { manejoCostos: manejo, label }
  }

  // ── Compras (1) ───────────────────────────────────────────────────────────
  if (manejo === 1) {
    let cotizacion: any = null

    if (costeoId > 0) {
      cotizacion = await (prisma as any).cotizacionItem.findFirst({
        where: {
          vigente: 1,
          solicitud: { itemId, costeoId },
        },
        select: {
          proveedorId:   true,
          referencia:    true,
          fecha:         true,
          cantidad:      true,
          total:         true,
          impuestos:     true,
          archivoUrl:    true,
          archivoNombre: true,
        },
      })
    }

    // Fallback GENERAL: solo si el ítem NO es Por Costeo
    if (!cotizacion && !esPorCosteo) {
      cotizacion = await (prisma as any).cotizacionItem.findFirst({
        where: {
          vigente: 1,
          solicitud: { itemId, costeoId: 0 },
        },
        select: {
          proveedorId:   true,
          referencia:    true,
          fecha:         true,
          cantidad:      true,
          total:         true,
          impuestos:     true,
          archivoUrl:    true,
          archivoNombre: true,
        },
      })
    }

    if (!cotizacion) {
      return { manejoCostos: manejo, label, porCosteo: item.porCosteo, compras: null }
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: cotizacion.proveedorId },
      select: { nombre: true },
    })

    const cant  = Number(cotizacion.cantidad)
    const total = Number(cotizacion.total)
    return {
      manejoCostos: manejo,
      label,
      porCosteo:    item.porCosteo,
      compras: {
        proveedorId:     cotizacion.proveedorId,
        proveedorNombre: proveedor?.nombre ?? `Proveedor ${cotizacion.proveedorId}`,
        referencia:      cotizacion.referencia ?? null,
        fecha:           cotizacion.fecha instanceof Date
          ? cotizacion.fecha.toISOString().slice(0, 10)
          : String(cotizacion.fecha).slice(0, 10),
        cantidad:        cant,
        total:           total,
        costoUnitario:   cant > 0 ? total / cant : 0,
        impuestos:       Number(cotizacion.impuestos),
        archivoUrl:      cotizacion.archivoUrl ?? null,
      },
    }
  }

  // ── Manual / Tabla Ítem (2, 5) ────────────────────────────────────────────
  if (manejo === 2 || manejo === 5) {
    const ultimo = await prisma.itemCosto.findFirst({
      where: { itemId },
      orderBy: { fecha: 'desc' },
      select: { costo: true, fecha: true, usuarioId: true },
    })

    if (!ultimo) {
      return { manejoCostos: manejo, label, manual: null }
    }

    let usuarioNombre: string | null = null
    if (ultimo.usuarioId) {
      const u = await prisma.usuario.findUnique({
        where: { id: ultimo.usuarioId },
        select: { nombre: true },
      })
      usuarioNombre = u?.nombre ?? null
    }

    return {
      manejoCostos: manejo,
      label,
      manual: {
        fecha:         (ultimo.fecha instanceof Date ? ultimo.fecha : new Date(ultimo.fecha))
                         .toISOString().slice(0, 10),
        costo:         Number(ultimo.costo),
        usuarioNombre,
      },
    }
  }

  // ── Referencia (3) ────────────────────────────────────────────────────────
  if (manejo === 3) {
    const refId = item.costoReferenciaItemId
    if (!refId) {
      return { manejoCostos: manejo, label, referencia: null }
    }

    const [ultimoPct, ultimoCostoBase, refItem] = await Promise.all([
      prisma.itemCostoRef.findFirst({
        where: { itemId },
        orderBy: { fecha: 'desc' },
        select: { pct: true, fecha: true },
      }),
      prisma.itemCosto.findFirst({
        where: { itemId: refId },
        orderBy: { fecha: 'desc' },
        select: { costo: true },
      }),
      prisma.item.findUnique({
        where: { id: refId },
        select: { descripcion: true },
      }),
    ])

    const pct       = ultimoPct ? Number(ultimoPct.pct) : 0
    const costoBase = ultimoCostoBase ? Number(ultimoCostoBase.costo) : 0

    return {
      manejoCostos: manejo,
      label,
      referencia: {
        itemReferenciaId:    refId,
        itemReferenciaNombre: refItem?.descripcion ?? `Ítem ${refId}`,
        pct,
        costoBase,
        costoCalculado:      (costoBase * pct) / 100,
        fechaPct:            ultimoPct?.fecha
          ? (ultimoPct.fecha instanceof Date ? ultimoPct.fecha : new Date(ultimoPct.fecha))
              .toISOString().slice(0, 10)
          : '',
      },
    }
  }

  // ── Solicitar (4) ─────────────────────────────────────────────────────────
  if (manejo === 4) {
    return { manejoCostos: manejo, label }
  }

  return { manejoCostos: manejo, label }
}
