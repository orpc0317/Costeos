'use server'

import { revalidatePath } from 'next/cache'
import { requirePermiso, puedeConsultar, reemplazarPermisosUsuario } from '@/app/actions/permisos'
import type { PermisoFlags } from '@/lib/permisos'
import { PERMISOS } from '@/lib/permisos'
import { crearUsuarioSchema, editarUsuarioSchema, type UsuarioRow } from '@/lib/types/usuarios'
import { UsuarioService } from '@/lib/services/usuario.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/usuarios'

export async function listarUsuarios(params?: { search?: string }): Promise<UsuarioRow[]> {
  if (!(await puedeConsultar(PERMISOS.USU_CAT))) return []
  return UsuarioService.listar(params)
}

export async function crearUsuario(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await requirePermiso(PERMISOS.USU_CAT, 'agregar')
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
  if (result.ok && result.data) {
    await reemplazarPermisosUsuario(result.data.id, parseFlags(formData.get('permisos')))
    revalidatePath(PATH)
  }
  return result
}

export async function editarUsuario(
  id: number,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<UsuarioRow>> {
  const guard = await requirePermiso(PERMISOS.USU_CAT, 'modificar')
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
  if (result.ok) {
    await reemplazarPermisosUsuario(id, parseFlags(formData.get('permisos')))
    revalidatePath(PATH)
  }
  return result
}

function parseFlags(raw: FormDataEntryValue | null): PermisoFlags[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw) as PermisoFlags[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export async function toggleActivo(id: number, registroVersion: number): Promise<ActionResult> {
  const guard = await requirePermiso(PERMISOS.USU_CAT, 'eliminar')
  if (!guard.ok) return guard

  const result = await UsuarioService.toggleActivo(id, registroVersion, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}
