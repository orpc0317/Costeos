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

// â”€â”€â”€ Tipo de respuesta estÃ¡ndar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string }

// â”€â”€â”€ Guard: solo ADMIN puede gestionar configuraciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function soloAdmin(): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado' }
  const rol = (session.user as { rol?: string }).rol
  if (rol !== ROLES.ADMIN) {
    return { ok: false, error: 'Solo los administradores pueden gestionar tipos de costeo' }
  }
  return { ok: true, userId: Number(session.user.id) }
}

// â”€â”€â”€ Listar tipos de costeo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      nivel1Activo: true,
      nivel1Etiqueta: true,
      nivel1ConDireccion: true,
      nivel2Activo: true,
      nivel2Etiqueta: true,
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
  // Obtener empresas del usuario
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
    empresaNombre: empresasMap[t.empresaId] || `Empresa ${t.empresaId}`,
    enUso: t._count.costeos > 0,
  }))
}

// â”€â”€â”€ Crear tipo de costeo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function crearTipoCosteo(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await soloAdmin()
  if (!guard.ok) return guard

  const raw = {
    empresaId: formData.get('empresaId'),
    nombre: formData.get('nombre'),
    nivel1Activo: formData.get('nivel1Activo') === 'true',
    nivel1Etiqueta: formData.get('nivel1Etiqueta') || '',
    nivel1ConDireccion: formData.get('nivel1ConDireccion') === 'true',
    nivel2Activo: formData.get('nivel2Activo') === 'true',
    nivel2Etiqueta: formData.get('nivel2Etiqueta') || '',
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
    nivel1Activo,
    nivel1Etiqueta,
    nivel1ConDireccion,
    nivel2Activo,
    nivel2Etiqueta,
    lineaEtiqueta,
    baseEvaluacion,
    manejoPlazo,
    fijarPlazo,
  } = parsed.data

  // Generar cÃ³digo autoincremental por empresa
  const count = await prisma.tipoCosteo.count({ where: { empresaId } })
  const correlativo = String(count + 1).padStart(3, '0')
  const codigo = correlativo

  // Verificar cÃ³digo Ãºnico por empresa
  const existente = await prisma.tipoCosteo.findFirst({ where: { empresaId, codigo } })
  if (existente) {
    return { ok: false, error: 'Error al generar el cÃ³digo, intente nuevamente' }
  }

  const tipo = await prisma.tipoCosteo.create({
    data: {
      empresaId,
      codigo,
      nombre,
      nivel1Activo,
      nivel1Etiqueta,
      nivel1ConDireccion,
      nivel2Activo,
      nivel2Etiqueta,
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
      nivel1Activo: true,
      nivel1Etiqueta: true,
      nivel1ConDireccion: true,
      nivel2Activo: true,
      nivel2Etiqueta: true,
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

// â”€â”€â”€ Editar tipo de costeo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    nivel1Activo: formData.get('nivel1Activo') === 'true',
    nivel1Etiqueta: formData.get('nivel1Etiqueta') || '',
    nivel1ConDireccion: formData.get('nivel1ConDireccion') === 'true',
    nivel2Activo: formData.get('nivel2Activo') === 'true',
    nivel2Etiqueta: formData.get('nivel2Etiqueta') || '',
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
    nivel1Activo,
    nivel1Etiqueta,
    nivel1ConDireccion,
    nivel2Activo,
    nivel2Etiqueta,
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

  // Verificar si estÃ¡ en uso (tiene costeos asociados)
  const costeosAsociados = await prisma.costeo.count({ where: { tipoCosteoId: id } })
  const enUso = costeosAsociados > 0

  // Si estÃ¡ en uso y trataron de cambiar la estructura de niveles (concurrencia), rechazamos
  if (enUso) {
    if (nivel1Activo !== tipoActual.nivel1Activo || nivel2Activo !== tipoActual.nivel2Activo || baseEvaluacion !== tipoActual.baseEvaluacion) {
      return { ok: false, error: 'El Tipo de Costeo acaba de ser utilizado en un Costeo nuevo por otro usuario y ya no se puede alterar su estructura de niveles ni su base de evaluaciÃ³n.' }
    }
  }

  // Verificar cÃ³digo Ãºnico (excluyendo el actual)
  const existente = await prisma.tipoCosteo.findFirst({
    where: { empresaId, codigo, NOT: { id } },
  })
  if (existente) {
    return { ok: false, error: 'Ya existe un tipo de costeo con este cÃ³digo', field: 'codigo' }
  }

  const updateData = {
    empresaId,
    codigo,
    nombre,
    nivel1Activo,
    nivel1Etiqueta,
    nivel1ConDireccion,
    nivel2Activo,
    nivel2Etiqueta,
    lineaEtiqueta,
    baseEvaluacion,
    fijarPlazo,
  }

  const updateResult = await prisma.tipoCosteo.updateMany({
    where: { id, registroVersion },
    data: { ...updateData, registroVersion: { increment: 1 } },
  })

  if (updateResult.count === 0) {
    return { ok: false, error: 'El registro ha sido modificado por otro usuario. Por favor, recarga la informaciÃ³n e intenta de nuevo.' }
  }

  const tipoNuevo = await prisma.tipoCosteo.findUnique({
    where: { id },
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      nombre: true,
      nivel1Activo: true,
      nivel1Etiqueta: true,
      nivel1ConDireccion: true,
      nivel2Activo: true,
      nivel2Etiqueta: true,
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

// â”€â”€â”€ Toggle activo / inactivo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return { ok: false, error: 'El registro ha sido modificado por otro usuario. Por favor, recarga la informaciÃ³n e intenta de nuevo.' }
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
      nivel1Activo: true,
      nivel1Etiqueta: true,
      nivel1ConDireccion: true,
      nivel2Activo: true,
      nivel2Etiqueta: true,
      lineaEtiqueta: true,
      baseEvaluacion: true,
      activo: true,
    },
    orderBy: { nombre: 'asc' },
  })

  return { ok: true, data: tipos }
}
