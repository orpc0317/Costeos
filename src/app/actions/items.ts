'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES } from '@/lib/permisos'
import { itemSchema, type ItemInput, type ItemRow } from '@/lib/types/items'

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string }

async function obtenerUsuarioActual(): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado' }
  const rol = (session.user as { rol?: string }).rol
  if (rol !== ROLES.ADMIN && rol !== ROLES.MANAGER) {
    return { ok: false, error: 'No tienes permisos para realizar esta acción' }
  }
  return { ok: true, userId: Number(session.user.id) }
}

export async function listarItems(busqueda?: string): Promise<ItemRow[]> {
  const session = await auth()
  if (!session?.user) return []

  const items = await prisma.item.findMany({
    where: busqueda
      ? {
          OR: [
            { descripcion: { contains: busqueda } },
            { codigoErp: { contains: busqueda } },
          ],
        }
      : undefined,
    include: {
      categoria: {
        select: {
          nombre: true
        }
      }
    },
    orderBy: { descripcion: 'asc' }
  })
  
  let empresasMap: Record<number, string> = {}
  try {
    const { getEmpresasForUser } = await import('@/app/actions/erp')
    const empresas = await getEmpresasForUser()
    empresas.forEach(e => {
      empresasMap[e.id] = e.nombre
    })
  } catch (error) {
    console.error('Error al obtener empresas para items', error)
  }

  return items.map(i => ({
    ...i,
    empresaNombre: empresasMap[i.empresa] || `Empresa ${i.empresa}`,
  }))
}

export async function crearItem(data: ItemInput): Promise<ActionResult<ItemRow>> {
  const userRes = await obtenerUsuarioActual()
  if (!userRes.ok) return { ok: false, error: userRes.error }

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { 
      ok: false, 
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString()
    }
  }

  try {
    const nuevo = await prisma.item.create({
      data: {
        empresa: parsed.data.empresa,
        descripcion: parsed.data.descripcion,
        unidadMedida: parsed.data.unidadMedida,
        tipoItem: parsed.data.tipoItem,
        tipoServicio: parsed.data.tipoServicio,
        codigoErp: parsed.data.codigoErp,
        categoriaId: parsed.data.categoriaId,
        precioVentaCero: parsed.data.precioVentaCero,
        activo: parsed.data.activo,
        usuarioCreo: userRes.userId,
      },
      include: {
        categoria: {
          select: { nombre: true }
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        tabla: 'costeos_item',
        registroId: nuevo.id,
        accion: 'CREATE',
        usuarioId: userRes.userId,
        datosDespues: JSON.stringify({ ...nuevo, categoria: undefined }),
      },
    })

    revalidatePath('/dashboard/configuracion/items')
    return { ok: true, data: nuevo }
  } catch (error: any) {
    return { ok: false, error: 'Ocurrió un error al crear el ítem.' }
  }
}

export async function actualizarItem(id: number, data: ItemInput): Promise<ActionResult<ItemRow>> {
  const userRes = await obtenerUsuarioActual()
  if (!userRes.ok) return { ok: false, error: userRes.error }

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { 
      ok: false, 
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString()
    }
  }

  try {
    const anterior = await prisma.item.findUnique({ where: { id } })
    
    const actualizado = await prisma.item.update({
      where: { id },
      data: {
        empresa: parsed.data.empresa,
        descripcion: parsed.data.descripcion,
        unidadMedida: parsed.data.unidadMedida,
        tipoItem: parsed.data.tipoItem,
        tipoServicio: parsed.data.tipoServicio,
        codigoErp: parsed.data.codigoErp,
        categoriaId: parsed.data.categoriaId,
        precioVentaCero: parsed.data.precioVentaCero,
        activo: parsed.data.activo,
        registroVersion: { increment: 1 }
      },
      include: {
        categoria: {
          select: { nombre: true }
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        tabla: 'costeos_item',
        registroId: actualizado.id,
        accion: 'UPDATE',
        usuarioId: userRes.userId,
        datosAntes: JSON.stringify(anterior),
        datosDespues: JSON.stringify({ ...actualizado, categoria: undefined }),
      },
    })

    revalidatePath('/dashboard/configuracion/items')
    return { ok: true, data: actualizado }
  } catch (error: any) {
    return { ok: false, error: 'Ocurrió un error al actualizar el ítem.' }
  }
}
