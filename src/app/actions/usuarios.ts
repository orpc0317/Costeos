'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { crearUsuarioSchema, editarUsuarioSchema, type UsuarioRow } from '@/lib/types/usuarios'
import { UsuarioService } from '@/lib/services/usuario.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/usuarios'

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  const guard = await requireAdmin()
  if (!guard.ok) return []
  return UsuarioService.listar()
}

export async function crearUsuario(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const raw = {
    nombre:     formData.get('nombre'),
    email:      formData.get('email'),
    password:   formData.get('password') || 'TEMP_Pass123!',
    rol:        formData.get('rol'),
    usuarioErp: formData.get('usuarioErp') || '',
  }

  const parsed = crearUsuarioSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  const result = await UsuarioService.crear({
    ...parsed.data,
    usuarioErp: parsed.data.usuarioErp ?? '',
  }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function editarUsuario(
  id: number,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<UsuarioRow>> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const raw = {
    nombre:          formData.get('nombre'),
    email:           formData.get('email'),
    password:        formData.get('password') || '',
    rol:             formData.get('rol'),
    usuarioErp:      formData.get('usuarioErp') || '',
    registroVersion: formData.get('registroVersion'),
  }

  const parsed = editarUsuarioSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  const result = await UsuarioService.editar(id, {
    ...parsed.data,
    password: parsed.data.password || undefined,
    usuarioErp: parsed.data.usuarioErp ?? '',
  }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function toggleActivo(id: number, registroVersion: number): Promise<ActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const result = await UsuarioService.toggleActivo(id, registroVersion, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}
