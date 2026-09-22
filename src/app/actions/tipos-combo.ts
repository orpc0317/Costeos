'use server'

import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { normalizeText } from '@/lib/utils/text'
import { TipoComboService } from '@/lib/services/tipo-combo.service'
import { detectarSimilares } from '@/lib/utils/similarity'
import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/lib/types/common'
import type { TipoComboRow } from '@/lib/types/tipos-combo'
import type { SimilarItem } from '@/lib/utils/similarity'

const REVALIDATE_PATH = '/dashboard/configuracion/tipos-combo'

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listarTiposCombo(): Promise<TipoComboRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return TipoComboService.listar()
}

/** Lista solo los TiposCombos activos de una empresa — para selects en el modal de Item. */
export async function listarTiposCombosPorEmpresa(
  empresaId: number,
): Promise<{ id: number; nombre: string }[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  const tipos = await prisma.tipoCombo.findMany({
    where: { empresaId },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  })
  return tipos
}

// ─── Similares (R18) ──────────────────────────────────────────────────────────

export async function buscarTipoComboSimilares(
  nombre: string,
  empresaId: number,
  excludeId?: number,
): Promise<SimilarItem[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const todos = await prisma.tipoCombo.findMany({
    where: { empresaId },
    select: { id: true, nombre: true },
  })

  const candidatos = todos
    .filter(t => t.id !== excludeId)
    .map(t => ({ id: t.id, descripcion: t.nombre }))

  return detectarSimilares(nombre, candidatos, 0.85)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function crearTipoCombo(data: {
  empresaId: number
  nombre: string
  icono?: string | null
}): Promise<ActionResult<TipoComboRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const nombre = normalizeText(data.nombre)
  if (!nombre)        return { ok: false, error: 'El nombre es requerido', field: 'nombre' }
  if (!data.empresaId) return { ok: false, error: 'La empresa es requerida', field: 'empresaId' }

  // Verificar duplicado exacto
  const duplicado = await TipoComboService.buscarDuplicado(nombre, data.empresaId)
  if (duplicado) {
    return { ok: false, error: 'Ya existe un tipo de combo con ese nombre en esta empresa', field: 'nombre' }
  }

  const result = await TipoComboService.crear(
    { empresaId: data.empresaId, nombre, icono: data.icono ?? null },
    guard.userId,
  )

  if (result.ok) revalidatePath(REVALIDATE_PATH)
  return result
}

export async function editarTipoCombo(
  id: number,
  data: {
    nombre: string
    icono?: string | null
    registroVersion: number
  },
): Promise<ActionResult<TipoComboRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const nombre = normalizeText(data.nombre)
  if (!nombre) return { ok: false, error: 'El nombre es requerido', field: 'nombre' }

  // Verificar duplicado exacto (excluyendo el propio registro)
  const tipo = await prisma.tipoCombo.findUnique({ where: { id }, select: { empresaId: true } })
  if (!tipo) return { ok: false, error: 'Tipo de combo no encontrado' }

  const duplicado = await TipoComboService.buscarDuplicado(nombre, tipo.empresaId, id)
  if (duplicado) {
    return { ok: false, error: 'Ya existe un tipo de combo con ese nombre en esta empresa', field: 'nombre' }
  }

  const result = await TipoComboService.editar(
    id,
    { empresaId: tipo.empresaId, nombre, icono: data.icono ?? null, registroVersion: data.registroVersion },
    guard.userId,
  )

  if (result.ok) revalidatePath(REVALIDATE_PATH)
  return result
}

export async function eliminarTipoCombo(
  id: number,
  registroVersion: number,
): Promise<ActionResult<void>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const result = await TipoComboService.eliminar(id, registroVersion, guard.userId)
  if (result.ok) revalidatePath(REVALIDATE_PATH)
  return result
}
