/**
 * solicitud-cotizacion.service.ts
 *
 * Lógica de negocio para SolicitudCotizacion y CotizacionItem.
 *
 * Reglas clave:
 * - GENERAL:      1 solicitud por itemId (costeoId=0). Reutiliza si ya existe.
 * - POR_PROYECTO: 1 solicitud por (itemId + costeoId). Reutiliza si ya existe.
 * - Al marcar vigente: todas las demás cotizaciones de esa solicitud → vigente=false,
 *   la seleccionada → vigente=true, solicitud → estado=2.
 */

import { prisma } from '@/lib/prisma'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { SolicitudRow, CotizacionItemInput, CotizacionItemRow } from '@/lib/types/cotizaciones'

export const SolicitudCotizacionService = {

  /**
   * Crea o reutiliza una solicitud para el ítem dado.
   * - GENERAL:      busca por (itemId, costeoId=0)
   * - POR_PROYECTO: busca por (itemId, costeoId)
   */
  async crearOObtener(params: {
    itemId:    number
    costeoId?: number | null
    scope:     string
    empresaId: number
    userId:    number
  }): Promise<{ id: number; estado: number; costoVigente: number | null }> {
    const { itemId, costeoId, scope, empresaId, userId } = params
    const costeoIdNorm = scope === 'GENERAL' ? 0 : (costeoId ?? 0)

    // Buscar existente
    const existente = await (prisma as any).solicitudCotizacion.findFirst({
      where: {
        itemId,
        costeoId: costeoIdNorm,
      },
    })

    if (existente && existente.estado !== 3) {
      // Obtener costo vigente
      const vigente = await (prisma as any).cotizacionItem.findFirst({
        where: { solicitudId: existente.id, vigente: true },
        select: { costoUnitario: true },
      })
      return {
        id: existente.id,
        estado: existente.estado,
        costoVigente: vigente ? Number(vigente.costoUnitario) : null,
      }
    }

    // Crear nueva solicitud
    const nueva = await (prisma as any).solicitudCotizacion.create({
      data: {
        empresaId,
        itemId,
        costeoId: costeoIdNorm,
        scope,
        estado: 1,
        usuarioCreo: userId,
      },
    })

    return { id: nueva.id, estado: nueva.estado, costoVigente: null }
  },

  /**
   * Devuelve el costo unitario de la cotización vigente para un ítem.
   * Busca primero en solicitud POR_PROYECTO (si se pasa costeoId), luego en GENERAL.
   */
  async getCostoVigente(itemId: number, costeoId?: number | null): Promise<number | null> {
    // 1. Buscar en solicitud específica al costeo
    if (costeoId && costeoId > 0) {
      const cotizacion = await (prisma as any).cotizacionItem.findFirst({
        where: {
          vigente: true,
          solicitud: { itemId, costeoId },
        },
        select: { costoUnitario: true },
      })
      if (cotizacion) return Number(cotizacion.costoUnitario)
    }

    // 2. Buscar en solicitud GENERAL (costeoId=0)
    const cotizacionGeneral = await (prisma as any).cotizacionItem.findFirst({
      where: {
        vigente: true,
        solicitud: { itemId, costeoId: 0 },
      },
      select: { costoUnitario: true },
    })
    return cotizacionGeneral ? Number(cotizacionGeneral.costoUnitario) : null
  },

  /**
   * Lista todas las solicitudes con datos enriquecidos para la pantalla de Compras.
   */
  async listar(empresaId?: number): Promise<SolicitudRow[]> {
    const where = empresaId ? { empresaId } : {}

    const solicitudes = await (prisma as any).solicitudCotizacion.findMany({
      where,
      orderBy: { fechaCreo: 'desc' },
      include: {
        cotizaciones: {
          select: { id: true, vigente: true, cantidad: true, total: true },
        },
      },
    })

    if (solicitudes.length === 0) return []

    // Resolver nombres via joins manuales
    const [items, costeos, empresas] = await Promise.all([
      prisma.item.findMany({
        where: { id: { in: Array.from(new Set(solicitudes.map((s: any) => s.itemId as number))) } },
        select: { id: true, descripcion: true, unidadMedida: true },
      }),
      (prisma as any).costeo.findMany({
        where: {
          id: {
            in: Array.from(new Set(solicitudes.map((s: any) => s.costeoId).filter((id: number) => id > 0) as number[]))
          },
        },
        select: {
          id: true,
          contrato: { select: { cliente: { select: { razonSocial: true } } } },
        },
      }),
      prisma.empresa.findMany({
        where: {
          id: {
            in: Array.from(
              new Set(
                solicitudes
                  .map((s: any) => s.empresaId)
                  .filter((id: number) => id > 0) as number[]
              )
            ),
          },
        },
        select: { id: true, nombre: true },
      }),
    ])

    const itemMap    = new Map(items.map((i: any) => [i.id, { descripcion: i.descripcion, unidadMedida: i.unidadMedida ?? '' }]))
    const costeoMap  = new Map(costeos.map((c: any) => [c.id, c.contrato?.cliente?.razonSocial ?? null]))
    const empresaMap = new Map(empresas.map((e: any) => [e.id, e.nombre]))

    return solicitudes.map((s: any) => {
      const vigenteCot = s.cotizaciones.find((c: any) => Number(c.vigente) === 1)
      const itemData   = itemMap.get(s.itemId)
      return {
        id:               s.id,
        empresaId:        s.empresaId,
        empresaNombre:    s.empresaId ? (empresaMap.get(s.empresaId) ?? null) : null,
        itemId:           s.itemId,
        itemDescripcion:  itemData?.descripcion ?? `Ítem ${s.itemId}`,
        itemUnidadMedida: itemData?.unidadMedida ?? '',
        costeoId:         s.costeoId || 0,
        cantidad:         Number(s.cantidad),
        clienteNombre:    s.costeoId > 0 ? (costeoMap.get(s.costeoId) as string ?? null) : null,
        scope:            s.scope,
        estado:           s.estado,
        fecha:            s.fecha,
        usuarioCreo:      s.usuarioCreo,
        fechaCreo:        s.fechaCreo,
        registroVersion:  s.registroVersion,
        totalCotizaciones: s.cotizaciones.length,
        costoVigente:     vigenteCot
          ? (Number(vigenteCot.cantidad) > 0 ? Number(vigenteCot.total) / Number(vigenteCot.cantidad) : 0)
          : null,
      } satisfies SolicitudRow
    })
  },

  /**
   * Lista las cotizaciones de una solicitud con nombre de proveedor.
   */
  async listarCotizaciones(solicitudId: number): Promise<CotizacionItemRow[]> {
    const rows = await (prisma as any).cotizacionItem.findMany({
      where: { solicitudId },
      orderBy: { fechaCreo: 'desc' },
    })
    if (rows.length === 0) return []

    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: Array.from(new Set(rows.map((r: any) => r.proveedorId as number))) } },
      select: { id: true, nombre: true },
    })
    const provMap = new Map(proveedores.map(p => [p.id, p.nombre]))

    return rows.map((r: any) => {
      const cant  = Number(r.cantidad)
      const total = Number(r.total)
      return {
        id:              r.id,
        solicitudId:     r.solicitudId,
        proveedorId:     r.proveedorId,
        proveedorNombre: provMap.get(r.proveedorId) ?? `Proveedor ${r.proveedorId}`,
        referencia:      r.referencia ?? null,
        fecha:           r.fecha instanceof Date
          ? r.fecha.toISOString().split('T')[0]
          : String(r.fecha),
        cantidad:        cant,
        total:           total,
        costoUnitario:   cant > 0 ? total / cant : 0,
        impuestos:       Number(r.impuestos),
        comentario:      r.comentario ?? null,
        archivoUrl:      r.archivoUrl ?? null,
        archivoNombre:   r.archivoNombre ?? null,
        vigente:         Number(r.vigente),
        estado:          Number(r.estado),
        usuarioCreo:     r.usuarioCreo,
        fechaCreo:       r.fechaCreo,
        registroVersion: r.registroVersion,
      } satisfies CotizacionItemRow
    })
  },

  /**
   * Registra una nueva cotización. Si marcarVigente=true, aplica la transacción
   * de vigencia: pone vigente=0 a todas las demás y sube estado solicitud a 2.
   */
  async registrarCotizacion(
    data: CotizacionItemInput,
    userId: number,
  ): Promise<CotizacionItemRow> {
    const nueva = await prisma.$transaction(async (tx) => {
      if (data.marcarVigente) {
        // Quitar vigente a todas las existentes
        await (tx as any).cotizacionItem.updateMany({
          where: { solicitudId: data.solicitudId },
          data:  { vigente: 0 },
        })
        // Subir estado solicitud a Vigente
        await (tx as any).solicitudCotizacion.update({
          where: { id: data.solicitudId },
          data:  { estado: 2 },
        })
      }

      return (tx as any).cotizacionItem.create({
        data: {
          solicitudId:  data.solicitudId,
          proveedorId:  data.proveedorId,
          referencia:   data.referencia ?? null,
          fecha:        new Date(data.fecha),
          cantidad:     data.cantidad,
          total:        data.total,
          impuestos:    data.impuestos ?? 0,
          comentario:   data.comentario ?? null,
          vigente:      data.marcarVigente ? 1 : 0,
          estado:       1,  // Ingresada por default
          archivoUrl:   data.archivoUrl ?? null,
          archivoNombre: data.archivoNombre ?? null,
          usuarioCreo:  userId,
        },
      })
    })

    // Resolver proveedor nombre
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: nueva.proveedorId },
      select: { nombre: true },
    })

    const cant  = Number(nueva.cantidad)
    const total = Number(nueva.total)
    return {
      id:              nueva.id,
      solicitudId:     nueva.solicitudId,
      proveedorId:     nueva.proveedorId,
      proveedorNombre: proveedor?.nombre ?? `Proveedor ${nueva.proveedorId}`,
      referencia:      nueva.referencia ?? null,
      fecha:           nueva.fecha instanceof Date
        ? nueva.fecha.toISOString().split('T')[0]
        : String(nueva.fecha),
      cantidad:        cant,
      total:           total,
      costoUnitario:   cant > 0 ? total / cant : 0,
      impuestos:       Number(nueva.impuestos),
      comentario:      nueva.comentario ?? null,
      archivoUrl:      nueva.archivoUrl ?? null,
      archivoNombre:   nueva.archivoNombre ?? null,
      vigente:         Number(nueva.vigente),
      estado:          Number(nueva.estado),
      usuarioCreo:     nueva.usuarioCreo,
      fechaCreo:       nueva.fechaCreo,
      registroVersion: nueva.registroVersion,
    }
  },

  /**
   * Marca una cotización como vigente (vigente=1) y desmarca las demás.
   * Sube el estado de la solicitud a Vigente (2).
   */
  async marcarVigente(cotizacionId: number, solicitudId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Quitar vigente a todas
      await (tx as any).cotizacionItem.updateMany({
        where: { solicitudId },
        data:  { vigente: 0 },
      })
      // Marcar esta como vigente
      await (tx as any).cotizacionItem.update({
        where: { id: cotizacionId },
        data:  { vigente: 1 },
      })
      // Subir estado solicitud
      await (tx as any).solicitudCotizacion.update({
        where: { id: solicitudId },
        data:  { estado: 2 },
      })
    })
  },

  /**
   * Elimina una cotización. Si era la vigente, actualiza el estado de la solicitud
   * a Ingresada (1) si no quedan otras vigentes.
   */
  async eliminarCotizacion(cotizacionId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const cot = await (tx as any).cotizacionItem.findUnique({
        where: { id: cotizacionId },
        select: { vigente: true, solicitudId: true },
      })
      if (!cot) return

      await (tx as any).cotizacionItem.delete({ where: { id: cotizacionId } })

      // Si era vigente, revisar si quedan vigentes
      if (cot.vigente) {
        const queda = await (tx as any).cotizacionItem.findFirst({
          where: { solicitudId: cot.solicitudId, vigente: true },
        })
        if (!queda) {
          await (tx as any).solicitudCotizacion.update({
            where: { id: cot.solicitudId },
            data:  { estado: 1 },
          })
        }
      }
    })
  },

  /**
   * Anula una solicitud completa (estado = 3).
   * Se mantiene para compatibilidad con flujos automáticos.
   */
  async anularSolicitud(solicitudId: number): Promise<void> {
    await (prisma as any).solicitudCotizacion.update({
      where: { id: solicitudId },
      data:  { estado: 3 },
    })
  },

  // ─── CRUD estándar ─────────────────────────────────────────────────────────

  /**
   * Crea una nueva solicitud. Siempre crea — sin lógica de reutilización.
   */
  async crear(data: {
    empresaId:   number
    itemId:      number
    costeoId:    number
    cantidad:    number
    scope:       string
    usuarioCreo: number
  }): Promise<{ id: number }> {
    const nueva = await (prisma as any).solicitudCotizacion.create({
      data: {
        empresaId:   data.empresaId,
        itemId:      data.itemId,
        costeoId:    data.costeoId,
        cantidad:    data.cantidad,
        scope:       data.scope,
        estado:      1,
        usuarioCreo: data.usuarioCreo,
      },
    })
    await AuditRepository.logCreate(
      'costeos_solicitud_compra',
      nueva.id,
      data.usuarioCreo,
      {
        empresaId: nueva.empresaId,
        itemId:    nueva.itemId,
        costeoId:  nueva.costeoId,
        cantidad:  Number(nueva.cantidad),
        scope:     nueva.scope,
        estado:    nueva.estado,
      },
    )
    return { id: nueva.id }
  },

  /**
   * Actualiza los campos editables de una solicitud con OCC.
   */
  async actualizar(
    id: number,
    data: { cantidad: number },
    registroVersion: number,
    userId: number,
  ): Promise<void> {
    // Leer antes para el diff
    const antes = await (prisma as any).solicitudCotizacion.findUnique({
      where: { id },
      select: { cantidad: true, scope: true, estado: true },
    })
    const result = await (prisma as any).solicitudCotizacion.updateMany({
      where: { id, registroVersion },
      data:  { cantidad: data.cantidad, registroVersion: registroVersion + 1 },
    })
    if (result.count === 0) {
      throw new Error('OCC: El registro fue modificado por otro usuario. Recarga e intenta de nuevo.')
    }
    await AuditRepository.logUpdate(
      'costeos_solicitud_compra',
      id,
      userId,
      { cantidad: Number(antes?.cantidad ?? 0) },
      { cantidad: data.cantidad },
    )
  },

  /**
   * Elimina una solicitud y sus cotizaciones (cascade en DB).
   */
  async eliminar(id: number, userId: number): Promise<void> {
    const antes = await (prisma as any).solicitudCotizacion.findUnique({
      where: { id },
      select: { empresaId: true, itemId: true, cantidad: true, scope: true, estado: true },
    })
    await (prisma as any).solicitudCotizacion.delete({ where: { id } })
    if (antes) {
      await AuditRepository.logDelete(
        'costeos_solicitud_compra',
        id,
        userId,
        {
          empresaId: antes.empresaId,
          itemId:    antes.itemId,
          cantidad:  Number(antes.cantidad),
          scope:     antes.scope,
          estado:    antes.estado,
        },
      )
    }
  },
}
