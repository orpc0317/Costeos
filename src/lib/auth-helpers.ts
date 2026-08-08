/**
 * auth-helpers.ts — Guards de autenticación y autorización reutilizables.
 *
 * REGLA: Todos los Server Actions deben comenzar llamando a uno de estos guards.
 * NUNCA copiar la lógica de auth directamente en un action.
 *
 * Uso:
 *   const guard = await requireAdmin()
 *   if (!guard.ok) return guard
 *   // guard.userId está disponible y tipado
 */

import { auth } from '@/lib/auth'
import { ROLES } from '@/lib/permisos'
import type { ActionResult } from '@/lib/types/common'

type AuthSuccess = { ok: true; userId: number; rol: string }
type AuthFailure = { ok: false; error: string }
type AuthGuard = AuthSuccess | AuthFailure

// ─── Requiere sesión activa (cualquier rol) ───────────────────────────────────

export async function requireAuth(): Promise<AuthGuard> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'No autenticado' }
  const rol = (session.user as { rol?: string }).rol ?? ''
  return { ok: true, userId: Number(session.user.id), rol }
}

// ─── Requiere rol ADMIN ───────────────────────────────────────────────────────

export async function requireAdmin(): Promise<AuthGuard> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  if (guard.rol !== ROLES.ADMIN) {
    return { ok: false, error: 'Solo los administradores pueden realizar esta acción' }
  }
  return guard
}

// ─── Requiere rol ADMIN o MANAGER ────────────────────────────────────────────

export async function requireManagerOrAdmin(): Promise<AuthGuard> {
  const guard = await requireAuth()
  if (!guard.ok) return guard
  if (guard.rol !== ROLES.ADMIN && guard.rol !== ROLES.MANAGER) {
    return { ok: false, error: 'No tienes permisos para realizar esta acción' }
  }
  return guard
}

// ─── Helper para extraer el userId del ERP desde la sesión ───────────────────

export async function getUsuarioErp(): Promise<{ usuarioErp: string } | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  // El usuarioErp se carga desde la DB en cada uso para garantizar frescura
  const { prisma } = await import('@/lib/prisma')
  const usuario = await prisma.usuario.findUnique({
    where: { id: parseInt(session.user.id, 10) },
    select: { usuarioErp: true },
  })
  return usuario
}
