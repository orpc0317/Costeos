'use server'

import { revalidatePath } from 'next/cache'
import { requirePermiso, puedeConsultar } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { empresaSchema, type EmpresaInput, type EmpresaRow, type CatalogoSyncRow } from '@/lib/types/empresas'
import { EmpresaService } from '@/lib/services/empresa.service'
import type { ActionResult } from '@/lib/types/common'
import { detectarSimilares, type SimilarItem } from '@/lib/utils/similarity'

const PATH = '/dashboard/configuracion/empresas'

export async function getEmpresas(): Promise<EmpresaRow[]> {
  if (!(await puedeConsultar(PERMISOS.EMP_CAT))) return []
  return EmpresaService.listar()
}

export async function crearEmpresa(data: EmpresaInput): Promise<ActionResult<EmpresaRow>> {
  const guard = await requirePermiso(PERMISOS.EMP_CAT, 'agregar')
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
  const guard = await requirePermiso(PERMISOS.EMP_CAT, 'modificar')
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

/** Busca empresas con nombre similar (scope global — las empresas son la entidad raíz). */
export async function buscarEmpresasSimilares(
  nombre: string,
  excluirId?: number,
): Promise<SimilarItem[]> {
  if (!(await puedeConsultar(PERMISOS.EMP_CAT))) return []
  const todas = await EmpresaService.listar()
  const paraComparar = todas.map(e => ({ id: e.id, descripcion: e.nombre }))
  return detectarSimilares(nombre, paraComparar, 0.85, excluirId)
}
