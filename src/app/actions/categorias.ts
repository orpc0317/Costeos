'use server'
import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { categoriaSchema, type CategoriaInput, type CategoriaRow } from '@/lib/types/categorias'
import { CategoriaService } from '@/lib/services/categoria.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/categorias'

export async function listarCategorias(): Promise<CategoriaRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return CategoriaService.listar()
}

export async function listarCategoriasPorEmpresa(empresaId: number): Promise<CategoriaRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return CategoriaService.listarPorEmpresa(empresaId)
}

export async function crearCategoria(data: CategoriaInput): Promise<ActionResult<CategoriaRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }
  try {
    const result = await CategoriaService.crear(parsed.data, guard.userId)
    if (result.ok) revalidatePath(PATH)
    return result
  } catch {
    return { ok: false, error: 'Error al guardar la categoría. Intenta de nuevo.' }
  }
}

export async function actualizarCategoria(id: number, data: CategoriaInput): Promise<ActionResult<CategoriaRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }
  try {
    const result = await CategoriaService.actualizar(id, parsed.data, guard.userId)
    if (result.ok) revalidatePath(PATH)
    return result
  } catch {
    return { ok: false, error: 'Error al guardar la categoría. Intenta de nuevo.' }
  }
}

export async function reordenarPrioridades(
  empresaId: number,
  orden: { id: number; registroVersion: number }[],
): Promise<ActionResult<void>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard
  try {
    const result = await CategoriaService.reordenar(empresaId, orden, guard.userId)
    if (result.ok) revalidatePath(PATH)
    return result
  } catch {
    return { ok: false, error: 'Error al guardar el orden. Intenta de nuevo.' }
  }
}
