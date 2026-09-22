'use server'

import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { normalizeText } from '@/lib/utils/text'
import type { TipoComboRHRow } from '@/lib/types/tipos-combo-rh'
import type { ActionResult } from '@/lib/types/common'

const REVALIDATE_PATH = '/dashboard/configuracion/items'
const MAX_ACTIVOS = 8

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Lista TODOS los tipos (activos e inactivos) de todas las empresas.
 * Usado en el panel de gestión.
 */
export async function listarTiposComboRH(): Promise<TipoComboRHRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const [rows, empresas] = await Promise.all([
    prisma.tipoComboRH.findMany({
      orderBy: [{ empresaId: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.empresa.findMany({ select: { id: true, nombre: true } }),
  ])

  const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))

  return rows.map(r => ({
    ...r,
    empresaNombre: empresaMap.get(r.empresaId) ?? String(r.empresaId),
  }))
}

/**
 * Lista los tipos ACTIVOS de una empresa, ordenados por `orden` ASC.
 * Usado en EditorPanel, AddNodeDialog y RecursosSummaryTable.
 */
export async function listarTiposComboRHPorEmpresa(
  empresaId: number,
): Promise<TipoComboRHRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const rows = await prisma.tipoComboRH.findMany({
    where: { empresaId, activo: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  })

  return rows
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function crearTipoComboRH(data: {
  empresaId: number
  nombre: string
  requerido: boolean
}): Promise<ActionResult<TipoComboRHRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const nombre = normalizeText(data.nombre)
  if (!nombre) return { ok: false, error: 'El nombre es requerido', field: 'nombre' }
  if (!data.empresaId) return { ok: false, error: 'La empresa es requerida', field: 'empresaId' }

  // Verificar duplicado dentro de la empresa
  const existente = await prisma.tipoComboRH.findFirst({
    where: { empresaId: data.empresaId, nombre },
  })
  if (existente) return { ok: false, error: 'Ya existe un tipo con ese nombre en esta empresa', field: 'nombre' }

  // Verificar límite de activos
  const countActivos = await prisma.tipoComboRH.count({
    where: { empresaId: data.empresaId, activo: true },
  })
  if (countActivos >= MAX_ACTIVOS) {
    return { ok: false, error: `Solo se permiten hasta ${MAX_ACTIVOS} tipos activos por empresa` }
  }

  // Calcular próximo orden
  const maxOrden = await prisma.tipoComboRH.aggregate({
    where: { empresaId: data.empresaId },
    _max: { orden: true },
  })
  const orden = (maxOrden._max.orden ?? 0) + 1

  const nuevo = await prisma.tipoComboRH.create({
    data: {
      empresaId: data.empresaId,
      nombre,
      requerido: data.requerido,
      orden,
      activo: true,
    },
  })

  revalidatePath(REVALIDATE_PATH)
  return { ok: true, data: nuevo }
}

export async function editarTipoComboRH(
  id: number,
  data: {
    nombre: string
    requerido: boolean
    orden: number
  },
): Promise<ActionResult<TipoComboRHRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const nombre = normalizeText(data.nombre)
  if (!nombre) return { ok: false, error: 'El nombre es requerido', field: 'nombre' }

  const actual = await prisma.tipoComboRH.findUnique({ where: { id } })
  if (!actual) return { ok: false, error: 'Tipo no encontrado' }

  // Verificar duplicado (excluyendo el mismo registro)
  const existente = await prisma.tipoComboRH.findFirst({
    where: { empresaId: actual.empresaId, nombre, NOT: { id } },
  })
  if (existente) return { ok: false, error: 'Ya existe un tipo con ese nombre en esta empresa', field: 'nombre' }

  const actualizado = await prisma.tipoComboRH.update({
    where: { id },
    data: {
      nombre,
      requerido: data.requerido,
      orden: data.orden,
    },
  })

  revalidatePath(REVALIDATE_PATH)
  return { ok: true, data: actualizado }
}

export async function toggleActivoTipoComboRH(
  id: number,
): Promise<ActionResult<undefined>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return { ok: false, error: 'No autorizado' }

  const tipo = await prisma.tipoComboRH.findUnique({ where: { id } })
  if (!tipo) return { ok: false, error: 'Tipo no encontrado' }

  // Si se va a activar, verificar límite
  if (!tipo.activo) {
    const countActivos = await prisma.tipoComboRH.count({
      where: { empresaId: tipo.empresaId, activo: true },
    })
    if (countActivos >= MAX_ACTIVOS) {
      return { ok: false, error: `Solo se permiten hasta ${MAX_ACTIVOS} tipos activos por empresa` }
    }
  }

  await prisma.tipoComboRH.update({
    where: { id },
    data: { activo: !tipo.activo },
  })

  revalidatePath(REVALIDATE_PATH)
  return { ok: true, data: undefined }
}
