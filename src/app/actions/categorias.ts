'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES } from '@/lib/permisos'
import { categoriaSchema, type CategoriaInput, type CategoriaRow } from '@/lib/types/categorias'

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

export async function listarCategorias(busqueda?: string): Promise<CategoriaRow[]> {
  const session = await auth()
  if (!session?.user) return []

  const categorias = await prisma.categoriaItem.findMany({
    where: busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda } },
          ],
        }
      : undefined,
    orderBy: { codigo: 'asc' }
  })
  
  let empresasMap: Record<number, string> = {}
  try {
    const { getEmpresasForUser } = await import('@/app/actions/erp')
    const empresas = await getEmpresasForUser()
    empresas.forEach(e => {
      empresasMap[e.id] = e.nombre
    })
  } catch (error) {
    console.error('Error al obtener empresas para categorías', error)
  }

  return categorias.map(c => ({
    ...c,
    empresaNombre: empresasMap[c.empresa] || `Empresa ${c.empresa}`,
  }))
}

export async function crearCategoria(data: CategoriaInput): Promise<ActionResult<CategoriaRow>> {
  const userRes = await obtenerUsuarioActual()
  if (!userRes.ok) return { ok: false, error: userRes.error }

  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { 
      ok: false, 
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString()
    }
  }

  try {
    let codigo = parsed.data.codigo

    if (!codigo) {
      const count = await prisma.categoriaItem.count({
        where: { empresa: parsed.data.empresa }
      })
      codigo = count + 1
    }

    const existing = await prisma.categoriaItem.findUnique({
      where: { codigo }
    })
    if (existing) {
      return { ok: false, error: 'El código de categoría ya existe', field: 'codigo' }
    }

    const nueva = await prisma.categoriaItem.create({
      data: {
        empresa: parsed.data.empresa,
        codigo,
        nombre: parsed.data.nombre,
        activo: parsed.data.activo,
        usuarioCreo: userRes.userId,
      }
    })

    await prisma.auditLog.create({
      data: {
        tabla: 'costeos_categoria_item',
        registroId: nueva.id,
        accion: 'CREATE',
        usuarioId: userRes.userId,
        datosDespues: JSON.stringify(nueva),
      },
    })

    revalidatePath('/dashboard/configuracion/categorias')
    return { ok: true, data: nueva }
  } catch (error: any) {
    return { ok: false, error: 'Ocurrió un error al crear la categoría.' }
  }
}

export async function actualizarCategoria(id: number, data: CategoriaInput): Promise<ActionResult<CategoriaRow>> {
  const userRes = await obtenerUsuarioActual()
  if (!userRes.ok) return { ok: false, error: userRes.error }

  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { 
      ok: false, 
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString()
    }
  }

  try {
    if (parsed.data.codigo) {
      const existing = await prisma.categoriaItem.findFirst({
        where: { 
          codigo: parsed.data.codigo,
          id: { not: id }
        }
      })
      
      if (existing) {
        return { ok: false, error: 'El código de categoría ya existe en otro registro', field: 'codigo' }
      }
    }

    const anterior = await prisma.categoriaItem.findUnique({ where: { id } })

    const actualizada = await prisma.categoriaItem.update({
      where: { id },
      data: {
        empresa: parsed.data.empresa,
        ...(parsed.data.codigo ? { codigo: parsed.data.codigo } : {}),
        nombre: parsed.data.nombre,
        activo: parsed.data.activo,
        registroVersion: { increment: 1 }
      }
    })

    await prisma.auditLog.create({
      data: {
        tabla: 'costeos_categoria_item',
        registroId: actualizada.id,
        accion: 'UPDATE',
        usuarioId: userRes.userId,
        datosAntes: JSON.stringify(anterior),
        datosDespues: JSON.stringify(actualizada),
      },
    })

    revalidatePath('/dashboard/configuracion/categorias')
    return { ok: true, data: actualizada }
  } catch (error: any) {
    return { ok: false, error: 'Ocurrió un error al actualizar la categoría.' }
  }
}
