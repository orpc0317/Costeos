'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { empresaSchema, type EmpresaInput, type EmpresaRow } from '@/lib/types/empresas'
import { EmpresaService } from '@/lib/services/empresa.service'
import { EmpresaRepository } from '@/lib/repositories/empresa.repository'
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
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
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

export async function actualizarEmpresa(
  id: number,
  data: EmpresaInput & { registroVersion: number },
): Promise<ActionResult<EmpresaRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = empresaSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  try {
    const result = await EmpresaService.actualizar(
      id,
      { ...parsed.data, registroVersion: data.registroVersion },
      guard.userId,
    )
    if (result.ok) revalidatePath(PATH)
    return result
  } catch (err) {
    console.error('[actualizarEmpresa]', err)
    return { ok: false, error: 'Error al guardar la empresa. Intenta de nuevo.' }
  }
}
