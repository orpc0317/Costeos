'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MENUS, PERMISOS, type Permiso, type PermisoFlags } from '@/lib/permisos'
import type { AuthGuard } from '@/lib/auth-helpers'

export type PermisosDetalle = {
  consultar: boolean
  agregar: boolean
  modificar: boolean
  eliminar: boolean
}

const DENEGADO: PermisosDetalle = { consultar: false, agregar: false, modificar: false, eliminar: false }
const TOTAL: PermisosDetalle = { consultar: true, agregar: true, modificar: true, eliminar: true }

async function usuarioActivo() {
  const session = await auth()
  if (!session?.user?.id) return null
  const userId = Number(session.user.id)
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true, activo: true, rol: true },
  })
  if (!usuario?.activo) return null
  return usuario
}

export async function getPermisosUsuario(): Promise<string[]> {
  const usuario = await usuarioActivo()
  if (!usuario) return []
  const count = await prisma.menuUsuario.count({ where: { usuarioId: usuario.id } })
  if (count === 0) return Object.values(PERMISOS)
  const rows = await prisma.menuUsuario.findMany({
    where: { usuarioId: usuario.id, consultar: true },
    select: { indice: true },
  })
  return rows.map((r) => r.indice)
}

export async function getPermisosDetalle(indice: string): Promise<PermisosDetalle> {
  const usuario = await usuarioActivo()
  if (!usuario) return DENEGADO
  const count = await prisma.menuUsuario.count({ where: { usuarioId: usuario.id } })
  if (count === 0) return TOTAL
  const row = await prisma.menuUsuario.findUnique({
    where: { usuarioId_indice: { usuarioId: usuario.id, indice } },
  })
  if (!row) return DENEGADO
  return {
    consultar: row.consultar,
    agregar: row.agregar,
    modificar: row.modificar,
    eliminar: row.eliminar,
  }
}

export async function puedeConsultar(indice: string): Promise<boolean> {
  const det = await getPermisosDetalle(indice)
  return det.consultar
}

/**
 * Primera instrucción de toda escritura.
 * Sin filas del usuario: acceso total. Con filas: solo el flag pedido.
 */
export async function requirePermiso(
  indice: string,
  operacion: 'agregar' | 'modificar' | 'eliminar',
): Promise<AuthGuard> {
  const usuario = await usuarioActivo()
  if (!usuario) return { ok: false, error: 'No tienes permiso para realizar esta acción.' }
  const count = await prisma.menuUsuario.count({ where: { usuarioId: usuario.id } })
  if (count === 0) return { ok: true, userId: usuario.id, rol: usuario.rol }
  const row = await prisma.menuUsuario.findUnique({
    where: { usuarioId_indice: { usuarioId: usuario.id, indice } },
  })
  if (!row?.[operacion]) return { ok: false, error: 'No tienes permiso para realizar esta acción.' }
  return { ok: true, userId: usuario.id, rol: usuario.rol }
}

export async function reemplazarPermisosUsuario(usuarioId: number, flags: PermisoFlags[]) {
  const validos = new Set(MENUS.map((m) => m.indice))
  const data = flags
    .filter((f) => validos.has(f.indice as Permiso) && (f.consultar || f.agregar || f.modificar || f.eliminar))
    .map((f) => ({
      usuarioId,
      indice: f.indice,
      consultar: f.consultar,
      agregar: f.agregar,
      modificar: f.modificar,
      eliminar: f.eliminar,
    }))
  await prisma.$transaction([
    prisma.menuUsuario.deleteMany({ where: { usuarioId } }),
    ...(data.length ? [prisma.menuUsuario.createMany({ data })] : []),
  ])
}

export async function leerPermisosUsuario(usuarioId: number): Promise<PermisoFlags[]> {
  const rows = await prisma.menuUsuario.findMany({ where: { usuarioId } })
  if (rows.length === 0) {
    return MENUS.map((m) => ({
      indice: m.indice,
      consultar: true,
      agregar: true,
      modificar: true,
      eliminar: true,
    }))
  }
  return MENUS.map((m) => {
    const row = rows.find((r) => r.indice === m.indice)
    return {
      indice: m.indice,
      consultar: !!row?.consultar,
      agregar: !!row?.agregar,
      modificar: !!row?.modificar,
      eliminar: !!row?.eliminar,
    }
  })
}
