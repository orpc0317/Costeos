'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES } from '@/lib/permisos'
import {
  crearTipoCosteoSchema,
  editarTipoCosteoSchema,
  type TipoCosteoRow,
} from '@/lib/types/tipos-costeo'

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string }

async function soloAdmin(): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado' }
  const rol = (session.user as { rol?: string }).rol
  if (rol !== ROLES.ADMIN) {
    return { ok: false, error: 'Solo los administradores pueden gestionar tipos de costeo' }
  }
  return { ok: true, userId: Number(session.user.id) }
}

export async function listarTiposCosteo(busqueda?: string): Promise<TipoCosteoRow[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tipos = await prisma.tipoCosteo.findMany({
    where: busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda } },
            { codigo: { contains: busqueda } },
          ],
        }
      : undefined,
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      nombre: true,
      cantidadNiveles: true,
      etiquetasNiveles: true,
      coloresNiveles: true,
      iconosNiveles: true,
      nivelConDireccion: true,
      lineaEtiqueta: true,
      baseEvaluacion: true,
      manejoPlazo: true,
      fijarPlazo: true,
      activo: true,
      creadoEn: true,
      registroVersion: true,
      _count: {
        select: { costeos: true }
      }
    },
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  })
  
  let empresasMap: Record<number, string> = {}
  try {
    const { getEmpresasForUser } = await import('@/app/actions/erp')
    const empresas = await getEmpresasForUser()
    empresas.forEach(e => {
      empresasMap[e.id] = e.nombre
    })
  } catch (error) {
    console.error('Error al obtener empresas para tipos de costeo', error)
  }

  return tipos.map(t => ({
    ...t,
    manejoPlazo: t.manejoPlazo as 'LIBRE' | 'FIJO' | 'NO_APLICA',
    empresaNombre: empresasMap[t.empresaId] || `Empresa ${t.empresaId}`,
    enUso: t._count.costeos > 0,
  }))
}

export async function crearTipoCosteo(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const raw = {
    empresaId: formData.get('empresaId'),
    nombre: formData.get('nombre'),
    cantidadNiveles: formData.get('cantidadNiveles'),
    etiquetasNiveles: formData.get('etiquetasNiveles') || '',
    coloresNiveles: formData.get('coloresNiveles') || '',
    iconosNiveles: formData.get('iconosNiveles') || '',
    nivelConDireccion: formData.get('nivelConDireccion'),
    lineaEtiqueta: formData.get('lineaEtiqueta') || '',
    baseEvaluacion: formData.get('baseEvaluacion') || 'GLOBAL',
    manejoPlazo: formData.get('manejoPlazo') || 'NO_APLICA',
    fijarPlazo: formData.get('fijarPlazo'),
  }

  const parsed = crearTipoCosteoSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  const {
    empresaId,
    nombre,
    cantidadNiveles,
    etiquetasNiveles,
    coloresNiveles,
    iconosNiveles,
    nivelConDireccion,
    lineaEtiqueta,
    baseEvaluacion,
    manejoPlazo,
    fijarPlazo,
  } = parsed.data

  const count = await prisma.tipoCosteo.count({ where: { empresaId } })
  const correlativo = String(count + 1).padStart(3, '0')
  const codigo = correlativo

  const existente = await prisma.tipoCosteo.findFirst({ where: { empresaId, codigo } })
  if (existente) {
    return { ok: false, error: 'Error al generar el código, intente nuevamente' }
  }

  const tipo = await prisma.tipoCosteo.create({
    data: {
      empresaId,
      codigo,
      nombre,
      cantidadNiveles,
      etiquetasNiveles,
      coloresNiveles,
      iconosNiveles,
      nivelConDireccion,
      lineaEtiqueta,
      baseEvaluacion,
      manejoPlazo,
      fijarPlazo,
      activo: true,
    },
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      nombre: true,
      cantidadNiveles: true,
      etiquetasNiveles: true,
      coloresNiveles: true,
      iconosNiveles: true,
      nivelConDireccion: true,
      lineaEtiqueta: true,
      baseEvaluacion: true,
      manejoPlazo: true,
      fijarPlazo: true,
      activo: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      tabla: 'costeos_tipo_costeo',
      registroId: tipo.id,
      accion: 'CREATE',
      usuarioId: guard.userId,
      datosDespues: JSON.stringify(tipo),
    },
  })

  revalidatePath('/dashboard/configuracion/tipos-costeo')
  return { ok: true, data: { id: tipo.id } }
}

export async function editarTipoCosteo(
  id: number,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<any>> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const raw = {
    empresaId: formData.get('empresaId'),
    codigo: formData.get('codigo'),
    nombre: formData.get('nombre'),
    cantidadNiveles: formData.get('cantidadNiveles'),
    etiquetasNiveles: formData.get('etiquetasNiveles') || '',
    coloresNiveles: formData.get('coloresNiveles') || '',
    iconosNiveles: formData.get('iconosNiveles') || '',
    nivelConDireccion: formData.get('nivelConDireccion'),
    lineaEtiqueta: formData.get('lineaEtiqueta') || '',
    baseEvaluacion: formData.get('baseEvaluacion') || 'GLOBAL',
    manejoPlazo: formData.get('manejoPlazo') || 'NO_APLICA',
    fijarPlazo: formData.get('fijarPlazo'),
    registroVersion: formData.get('registroVersion'),
  }

  const parsed = editarTipoCosteoSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  let {
    empresaId,
    codigo,
    nombre,
    cantidadNiveles,
    etiquetasNiveles,
    coloresNiveles,
    iconosNiveles,
    nivelConDireccion,
    lineaEtiqueta,
    baseEvaluacion,
    manejoPlazo,
    fijarPlazo,
    registroVersion,
  } = parsed.data

  const tipoActual = await prisma.tipoCosteo.findUnique({ where: { id } })
  if (!tipoActual) {
    return { ok: false, error: 'Tipo de costeo no encontrado' }
  }

  const costeosAsociados = await prisma.costeo.count({ where: { tipoCosteoId: id } })
  const enUso = costeosAsociados > 0

  if (enUso) {
    if (cantidadNiveles !== tipoActual.cantidadNiveles || baseEvaluacion !== tipoActual.baseEvaluacion || nivelConDireccion !== tipoActual.nivelConDireccion) {
      return { ok: false, error: 'El Tipo de Costeo está siendo utilizado en un Costeo. No se puede alterar su estructura de niveles ni su base de evaluación.' }
    }
  }

  const existente = await prisma.tipoCosteo.findFirst({
    where: { empresaId, codigo, NOT: { id } },
  })
  if (existente) {
    return { ok: false, error: 'Ya existe un tipo de costeo con este código', field: 'codigo' }
  }

  const updateData = {
    empresaId,
    codigo,
    nombre,
    cantidadNiveles,
    etiquetasNiveles,
    coloresNiveles,
    iconosNiveles,
    nivelConDireccion,
    lineaEtiqueta,
    baseEvaluacion,
    manejoPlazo,
    fijarPlazo,
  }

  const updateResult = await prisma.tipoCosteo.updateMany({
    where: { id, registroVersion },
    data: { ...updateData, registroVersion: { increment: 1 } },
  })

  if (updateResult.count === 0) {
    return { ok: false, error: 'El registro ha sido modificado por otro usuario. Por favor, recarga la información e intenta de nuevo.' }
  }

  const tipoNuevo = await prisma.tipoCosteo.findUnique({
    where: { id },
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      nombre: true,
      cantidadNiveles: true,
      etiquetasNiveles: true,
      nivelConDireccion: true,
      lineaEtiqueta: true,
      baseEvaluacion: true,
      manejoPlazo: true,
      fijarPlazo: true,
      activo: true,
      creadoEn: true,
      registroVersion: true,
    },
  })

  if (!tipoNuevo) return { ok: false, error: 'Error al recuperar registro actualizado' }

  const { creadoEn: _1, modificadoEn: _2, ...datosAntesSeguros } = tipoActual as any

  await prisma.auditLog.create({
    data: {
      tabla: 'costeos_tipo_costeo',
      registroId: id,
      accion: 'UPDATE',
      usuarioId: guard.userId,
      datosAntes: JSON.stringify(datosAntesSeguros),
      datosDespues: JSON.stringify(tipoNuevo),
    },
  })

  revalidatePath('/dashboard/configuracion/tipos-costeo')
  return { ok: true, data: { ...tipoNuevo, enUso } }
}

export async function toggleActivo(id: number, registroVersion: number): Promise<ActionResult> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const tipo = await prisma.tipoCosteo.findUnique({
    where: { id },
    select: { activo: true },
  })
  if (!tipo) return { ok: false, error: 'Tipo de costeo no encontrado' }

  const updateResult = await prisma.tipoCosteo.updateMany({
    where: { id, registroVersion },
    data: { activo: !tipo.activo, registroVersion: { increment: 1 } },
  })

  if (updateResult.count === 0) {
    return { ok: false, error: 'El registro ha sido modificado por otro usuario. Por favor, recarga la información e intenta de nuevo.' }
  }

  const tipoNuevo = await prisma.tipoCosteo.findUnique({
    where: { id },
    select: { activo: true }
  })
  if (!tipoNuevo) return { ok: false, error: 'No se encontro registro actualizado' }

  await prisma.auditLog.create({
    data: {
      tabla: 'costeos_tipo_costeo',
      registroId: id,
      accion: 'UPDATE',
      usuarioId: guard.userId,
      datosAntes: JSON.stringify({ activo: tipo.activo }),
      datosDespues: JSON.stringify({ activo: tipoNuevo.activo }),
    },
  })

  revalidatePath('/dashboard/configuracion/tipos-costeo')
  return { ok: true, data: undefined }
}

export async function getTiposCosteoActivosAction() {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado', data: [] }
  
  const tipos = await prisma.tipoCosteo.findMany({
    where: { activo: true },
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      nombre: true,
      cantidadNiveles: true,
      etiquetasNiveles: true,
      nivelConDireccion: true,
      lineaEtiqueta: true,
      baseEvaluacion: true,
      manejoPlazo: true,
      fijarPlazo: true,
      activo: true,
    },
    orderBy: { nombre: 'asc' },
  })

  return { ok: true, data: tipos }
}
