'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { empresaSchema, type EmpresaInput, type EmpresaRow, type CatalogoSyncRow } from '@/lib/types/empresas'
import { EmpresaService } from '@/lib/services/empresa.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/empresas'

export async function getEmpresas(): Promise<EmpresaRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return EmpresaService.listar()
}

export async function crearEmpresa(data: EmpresaInput): Promise<ActionResult<EmpresaRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = empresaSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok:    false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString(),
    }
  }

  try {
    const result = await EmpresaService.crear(parsed.data, guard.userId)
    if (result.ok) revalidatePath(PATH)
    return result
  } catch (err) {
    console.error('[crearEmpresa]', err)
    return { ok: false, error: 'Error al guardar la empresa. Intenta de nuevo.' }
  }
}

/**
 * Actualiza empresa + catálogos de sincronización en una sola operación.
 * Genera un único registro de auditoría con todos los campos que cambiaron.
 */
export async function actualizarEmpresaCompleto(
  id: number,
  data: EmpresaInput & { registroVersion: number },
  catalogosSync: CatalogoSyncRow[],
): Promise<ActionResult<EmpresaRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = empresaSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok:    false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path[0]?.toString(),
    }
  }

  try {
    const result = await EmpresaService.actualizarCompleto(
      id,
      { ...parsed.data, registroVersion: data.registroVersion },
      catalogosSync,
      guard.userId,
    )
    if (result.ok) revalidatePath(PATH)
    return result
  } catch (err) {
    console.error('[actualizarEmpresaCompleto]', err)
    return { ok: false, error: 'Error al guardar la empresa. Intenta de nuevo.' }
  }
}
