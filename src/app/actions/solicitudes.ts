'use server'
/**
 * solicitudes.ts — Server Actions para el módulo de Cotizaciones Compras.
 */
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'
import { SolicitudCotizacionService } from '@/lib/services/solicitud-cotizacion.service'
import { cotizacionItemSchema, type CotizacionItemInput, type SolicitudRow, type CotizacionItemRow, type CotizacionRow, nuevaCotizacionDirectaSchema, type NuevaCotizacionDirectaInput } from '@/lib/types/cotizaciones'
import type { ActionResult } from '@/lib/types/common'
import { prisma } from '@/lib/prisma'

const PATH_COMPRAS = '/dashboard/compras/solicitudes'

// ─── Crear o reutilizar solicitud (llamado desde el costeo) ───────────────────

export async function crearOObtenerSolicitud(params: {
  itemId:    number
  costeoId?: number
  scope:     string
  empresaId: number
}): Promise<ActionResult<{ id: number; estado: number; costoVigente: number | null }>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    const result = await SolicitudCotizacionService.crearOObtener({
      ...params,
      userId: guard.userId,
    })
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: result }
  } catch (e) {
    console.error('[crearOObtenerSolicitud]', e)
    return { ok: false, error: 'Error al procesar la solicitud de cotización.' }
  }
}

// ─── Obtener costo vigente para un ítem ──────────────────────────────────────

export async function getCostoVigente(
  itemId:   number,
  costeoId?: number,
): Promise<number | null> {
  const guard = await requireAuth()
  if (!guard.ok) return null
  try {
    return await SolicitudCotizacionService.getCostoVigente(itemId, costeoId)
  } catch {
    return null
  }
}

// ─── Listar solicitudes para pantalla Compras ─────────────────────────────────

export async function listarSolicitudes(empresaId?: number): Promise<SolicitudRow[]> {
  const guard = await requireAuth()
  if (!guard.ok) return []
  try {
    return await SolicitudCotizacionService.listar(empresaId)
  } catch {
    return []
  }
}

// ─── Listar cotizaciones de una solicitud ─────────────────────────────────────

export async function listarCotizaciones(solicitudId: number): Promise<CotizacionItemRow[]> {
  const guard = await requireAuth()
  if (!guard.ok) return []
  try {
    return await SolicitudCotizacionService.listarCotizaciones(solicitudId)
  } catch {
    return []
  }
}

// ─── Registrar cotización ─────────────────────────────────────────────────────

export async function registrarCotizacion(
  data: CotizacionItemInput,
): Promise<ActionResult<CotizacionItemRow>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  const parsed = cotizacionItemSchema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() }
  }
  try {
    const result = await SolicitudCotizacionService.registrarCotizacion(parsed.data, guard.userId)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: result }
  } catch (e) {
    console.error('[registrarCotizacion]', e)
    return { ok: false, error: 'Error al registrar la cotización. Intenta de nuevo.' }
  }
}

// ─── Marcar cotización como vigente ──────────────────────────────────────────

export async function marcarCotizacionVigente(
  cotizacionId: number,
  solicitudId:  number,
): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    await SolicitudCotizacionService.marcarVigente(cotizacionId, solicitudId)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[marcarCotizacionVigente]', e)
    return { ok: false, error: 'Error al marcar la cotización como vigente.' }
  }
}

// ─── Eliminar cotización ──────────────────────────────────────────────────────

export async function eliminarCotizacion(id: number): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    await SolicitudCotizacionService.eliminarCotizacion(id)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[eliminarCotizacion]', e)
    return { ok: false, error: 'Error al eliminar la cotización.' }
  }
}

// ─── Anular solicitud ─────────────────────────────────────────────────────────

export async function anularSolicitud(id: number): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    await SolicitudCotizacionService.anularSolicitud(id)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[anularSolicitud]', e)
    return { ok: false, error: 'Error al anular la solicitud.' }
  }
}

export async function getItemsByEmpresa(empresaId: number) {
  const session = await requireAuth()
  if (!session.ok) throw new Error('No autenticado')
  const items = await prisma.item.findMany({
    where: { empresaId },
    select: {
      id:             true,
      descripcion:    true,
      cotizacionScope: true,
      unidadMedida:   true,
    },
    orderBy: { descripcion: 'asc' },
  })
  return items
}

/** @deprecated Usar getItemsByEmpresa */
export const getItemsComprasByEmpresa = getItemsByEmpresa

// ─── CRUD estándar de SolicitudCompra ────────────────────────────────────────

export async function crearSolicitud(data: {
  empresaId: number
  itemId:    number
  costeoId:  number
  cantidad:  number
  scope:     string
}): Promise<ActionResult<{ id: number }>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    const result = await SolicitudCotizacionService.crear({ ...data, usuarioCreo: guard.userId })
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: result }
  } catch (e) {
    console.error('[crearSolicitud]', e)
    return { ok: false, error: 'Error al crear la solicitud.' }
  }
}

export async function actualizarSolicitud(
  id: number,
  data: { cantidad: number },
  registroVersion: number,
): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    await SolicitudCotizacionService.actualizar(id, data, registroVersion, guard.userId)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: undefined }
  } catch (e: any) {
    const msg = e?.message?.includes('OCC') ? e.message : 'Error al actualizar la solicitud.'
    return { ok: false, error: msg }
  }
}

export async function eliminarSolicitud(id: number): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    await SolicitudCotizacionService.eliminar(id, guard.userId)
    revalidatePath(PATH_COMPRAS)
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[eliminarSolicitud]', e)
    return { ok: false, error: 'Error al eliminar la solicitud. Verifica que no tenga datos dependientes.' }
  }
}

// ─── CRUD de CotizacionItem (pantalla Cotizaciones) ───────────────────────────

const PATH_COTIZACIONES = '/dashboard/compras/cotizaciones'

export async function listarTodasCotizaciones(): Promise<CotizacionRow[]> {
  const guard = await requireAuth()
  if (!guard.ok) return []
  try {
    const rows: any[] = await (prisma as any).cotizacionItem.findMany({
      orderBy: { fechaCreo: 'desc' },
    })
    if (rows.length === 0) return []

    // IDs que necesitamos resolver
    const proveedorIds = Array.from(new Set<number>(rows.map((r) => Number(r.proveedorId))))
    const solicitudIds = Array.from(new Set<number>(
      rows.filter((r) => r.solicitudId != null).map((r) => Number(r.solicitudId))
    ))

    // Cargar solicitudes y proveedores en paralelo
    const [solicitudesRaw, proveedores]: [any[], { id: number; nombre: string }[]] = await Promise.all([
      solicitudIds.length > 0
        ? (prisma as any).solicitudCotizacion.findMany({
            where: { id: { in: solicitudIds } },
            select: { id: true, empresaId: true, itemId: true, costeoId: true, estado: true },
          })
        : Promise.resolve([]),
      prisma.proveedor.findMany({
        where: { id: { in: proveedorIds } },
        select: { id: true, nombre: true },
      }),
    ])

    const solicitudes: Array<{ id: number; empresaId: number; itemId: number; costeoId: number; estado: number }> = solicitudesRaw

    // Unificar itemIds y empresaIds: de solicitudes + de cotizaciones directas
    const itemIds = Array.from(new Set<number>([
      ...solicitudes.map((s) => s.itemId),
      ...rows.filter((r) => r.itemId != null).map((r) => Number(r.itemId)),
    ].filter((id) => id > 0)))

    const empresaIds = Array.from(new Set<number>([
      ...solicitudes.map((s) => s.empresaId).filter((id) => id > 0),
      ...rows.filter((r) => r.empresaId != null).map((r) => Number(r.empresaId)),
    ].filter((id) => id > 0)))

    const costeoIds = Array.from(new Set<number>(
      solicitudes.map((s) => s.costeoId).filter((id) => id > 0)
    ))

    const [items, empresas, coteosRaw]: [
      Array<{ id: number; descripcion: string; unidadMedida: string | null }>,
      Array<{ id: number; nombre: string }>,
      any[]
    ] = await Promise.all([
      itemIds.length > 0
        ? prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, descripcion: true, unidadMedida: true } })
        : Promise.resolve([]),
      empresaIds.length > 0
        ? prisma.empresa.findMany({ where: { id: { in: empresaIds } }, select: { id: true, nombre: true } })
        : Promise.resolve([]),
      costeoIds.length > 0
        ? (prisma as any).costeo.findMany({
            where: { id: { in: costeoIds } },
            select: { id: true, contrato: { select: { nombre: true, cliente: { select: { razonSocial: true } } } } },
          })
        : Promise.resolve([]),
    ])

    const solMap    = new Map<number, typeof solicitudes[number]>(solicitudes.map((s) => [s.id, s]))
    const provMap   = new Map<number, string>(proveedores.map((p) => [p.id, p.nombre]))
    const itemMap   = new Map<number, typeof items[number]>(items.map((i) => [i.id, i]))
    const empMap    = new Map<number, string>(empresas.map((e) => [e.id, e.nombre]))
    const costeoMap = new Map<number, { clienteNombre: string | null; proyectoNombre: string | null }>(
      (coteosRaw as any[]).map((c: any) => [
        c.id as number,
        {
          clienteNombre:  (c.contrato?.cliente?.razonSocial ?? null) as string | null,
          proyectoNombre: (c.contrato?.nombre ?? null) as string | null,
        },
      ])
    )

    return rows.map((r: any) => {
      const solId  = r.solicitudId != null ? Number(r.solicitudId) : null
      const sol    = solId != null ? (solMap.get(solId) ?? null) : null

      // itemId y empresaId: de la solicitud si existe, si no de la cotización directa
      const resolvedItemId    = sol?.itemId    ?? (r.itemId    != null ? Number(r.itemId)    : null)
      const resolvedEmpresaId = sol?.empresaId ?? (r.empresaId != null ? Number(r.empresaId) : null)

      const item  = resolvedItemId != null ? (itemMap.get(resolvedItemId) ?? null) : null
      const cant  = Number(r.cantidad)
      const total = Number(r.total)
      const costeoData = sol && sol.costeoId > 0 ? (costeoMap.get(sol.costeoId) ?? null) : null

      return {
        id:              r.id,
        solicitudId:     solId,
        proveedorId:     Number(r.proveedorId),
        proveedorNombre: provMap.get(Number(r.proveedorId)) ?? `Proveedor ${r.proveedorId}`,
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
        // Datos del ítem
        itemId:           resolvedItemId,
        itemDescripcion:  item?.descripcion  ?? null,
        itemUnidadMedida: item?.unidadMedida ?? null,
        // Datos de la empresa
        empresaId:        resolvedEmpresaId,
        empresaNombre:    resolvedEmpresaId ? (empMap.get(resolvedEmpresaId) ?? null) : null,
        // Estado de la solicitud (null si cotización directa)
        solicitudEstado:  sol?.estado ?? null,
        // Cliente y proyecto (solo si viene de un costeo)
        clienteNombre:    costeoData?.clienteNombre  ?? null,
        proyectoNombre:   costeoData?.proyectoNombre ?? null,
      } satisfies CotizacionRow
    })
  } catch (e) {
    console.error('[listarTodasCotizaciones]', e)
    return []
  }
}

export async function crearCotizacionDirecta(
  data: NuevaCotizacionDirectaInput,
): Promise<ActionResult<{ cotizacionId: number }>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  const parsed = nuevaCotizacionDirectaSchema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() }
  }
  const d = parsed.data
  try {
    const cot = await (prisma as any).cotizacionItem.create({
      data: {
        solicitudId:   null,           // cotización directa — sin solicitud padre
        empresaId:     d.empresaId,    // guardado directamente en la cotización
        itemId:        d.itemId,       // guardado directamente en la cotización
        proveedorId:   d.proveedorId,
        referencia:    d.referencia    ?? null,
        fecha:         new Date(d.fecha),
        cantidad:      d.cantidad,
        total:         d.total,
        impuestos:     d.impuestos,
        comentario:    d.comentario    ?? null,
        archivoUrl:    d.archivoUrl    ?? null,
        archivoNombre: d.archivoNombre ?? null,
        vigente:       d.marcarVigente ? 1 : 0,
        estado:        1,              // Ingresada
        usuarioCreo:   guard.userId,
        registroVersion: 1,
      },
    })
    revalidatePath(PATH_COMPRAS)
    revalidatePath(PATH_COTIZACIONES)
    return { ok: true, data: { cotizacionId: cot.id } }
  } catch (e) {
    console.error('[crearCotizacionDirecta]', e)
    return { ok: false, error: 'Error al crear la cotización.' }
  }
}

export async function actualizarCotizacion(
  id: number,
  data: {
    referencia?: string | null
    fecha?: string
    cantidad?: number
    total?: number
    impuestos?: number
    comentario?: string | null
  },
  registroVersion: number,
): Promise<ActionResult<void>> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  try {
    const result = await (prisma as any).cotizacionItem.updateMany({
      where: { id, registroVersion },
      data: {
        ...(data.referencia !== undefined && { referencia: data.referencia }),
        ...(data.fecha      !== undefined && { fecha: new Date(data.fecha) }),
        ...(data.cantidad   !== undefined && { cantidad: data.cantidad }),
        ...(data.total      !== undefined && { total: data.total }),
        ...(data.impuestos  !== undefined && { impuestos: data.impuestos }),
        ...(data.comentario !== undefined && { comentario: data.comentario }),
        registroVersion: registroVersion + 1,
      },
    })
    if (result.count === 0) {
      return { ok: false, error: 'El registro fue modificado por otro usuario. Recarga e intenta de nuevo.' }
    }
    revalidatePath(PATH_COMPRAS)
    revalidatePath(PATH_COTIZACIONES)
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[actualizarCotizacion]', e)
    return { ok: false, error: 'Error al actualizar la cotización.' }
  }
}

export async function getCotizacionById(id: number): Promise<CotizacionRow | null> {
  const guard = await requireAuth()
  if (!guard.ok) return null
  try {
    const rows = await listarTodasCotizaciones()
    return rows.find(r => r.id === id) ?? null
  } catch {
    return null
  }
}
