/**
 * categoria.service.ts — Lógica de negocio para Categorías de Items.
 *
 * Responsabilidades:
 * - Validación de duplicados (nombre único por empresa)
 * - Auto-asignación de prioridad correlativa al crear
 * - Reordenamiento de prioridades en lote (drag & drop)
 * - Garantizar atomicidad (registro + audit log en una transacción)
 * - Validación de Concurrencia Optimística (OCC)
 *
 * NO hace: auth, validación Zod, revalidatePath. Eso lo hace el Action.
 */

import { prisma } from '@/lib/prisma'
import { CategoriaRepository } from '@/lib/repositories/categoria.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import type { ActionResult } from '@/lib/types/common'
import type { CategoriaInput, CategoriaRow } from '@/lib/types/categorias'

const TABLA = 'costeos_categoria'

/** Campos auditables con labels legibles (docs/conventions.md §16). */
const CAMPOS_CATEGORIA = [
  { key: 'empresaId', label: 'Empresa ID' },
  { key: 'nombre',    label: 'Nombre' },
] as const

const CAMPOS_PRIORIDAD = [
  { key: 'prioridad', label: 'Prioridad' },
] as const

export const CategoriaService = {

  async listar(): Promise<CategoriaRow[]> {
    const rows = await CategoriaRepository.findAll()
    return rows.map(r => ({
      ...r,
      empresaNombre: r.empresa?.nombre ?? `Empresa ${r.empresaId}`,
    }))
  },

  async listarPorEmpresa(empresaId: number): Promise<CategoriaRow[]> {
    const rows = await CategoriaRepository.findByEmpresa(empresaId)
    return rows.map(r => ({ ...r, empresaNombre: undefined }))
  },

  async crear(data: CategoriaInput, userId: number): Promise<ActionResult<CategoriaRow>> {
    const existe = await CategoriaRepository.findByNombreYEmpresa(data.nombre, data.empresaId)
    if (existe) {
      return { ok: false, error: 'Ya existe una categoría con ese nombre en esta empresa', field: 'nombre' }
    }

    const maxPrioridad = await CategoriaRepository.findMaxPrioridad(data.empresaId)
    const nuevaPrioridad = maxPrioridad + 1

    const nueva = await prisma.$transaction(async (tx) => {
      const reg = await CategoriaRepository.create(
        { empresaId: data.empresaId, nombre: data.nombre, prioridad: nuevaPrioridad },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, reg as any, tx as any)
      return reg
    })

    return {
      ok: true,
      data: { ...nueva, empresaNombre: undefined } as CategoriaRow,
    }
  },

  async actualizar(id: number, data: CategoriaInput, userId: number): Promise<ActionResult<CategoriaRow>> {
    const anterior = await CategoriaRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Categoría no encontrada' }

    const existente = await CategoriaRepository.findByNombreYEmpresaExcluding(data.nombre, data.empresaId, id)
    if (existente) {
      return { ok: false, error: 'Ya existe una categoría con ese nombre en esta empresa', field: 'nombre' }
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const reg = await CategoriaRepository.update(
        id,
        { empresaId: data.empresaId, nombre: data.nombre, registroVersion: anterior.registroVersion },
        tx as any,
      )
      if (!reg) return null

      // Solo loguear los campos que realmente cambiaron, con labels legibles
      const { antes, despues } = computeDiff(CAMPOS_CATEGORIA, anterior as any, reg as any)
      if (Object.keys(antes).length > 0) {
        await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
      }
      return reg
    })

    if (!actualizada) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: actualizada as CategoriaRow }
  },

  /**
   * Reordena las prioridades de las categorías de una empresa.
   * orden: array de { id, registroVersion } en el nuevo orden deseado (índice 0 → prioridad 1).
   */
  async reordenar(
    empresaId: number,
    orden: { id: number; registroVersion: number }[],
    userId: number,
  ): Promise<ActionResult<void>> {
    const categoriasActuales = await CategoriaRepository.findByEmpresa(empresaId)
    const idsEmpresa = new Set(categoriasActuales.map(c => c.id))

    const idsInvalidos = orden.filter(({ id }) => !idsEmpresa.has(id))
    if (idsInvalidos.length > 0) {
      return { ok: false, error: 'Algunos registros no pertenecen a la empresa indicada.' }
    }

    const actualizaciones = orden.map(({ id, registroVersion }, index) => ({
      id,
      prioridad: index + 1,
      registroVersion,
    }))

    let conflictos: number[] = []

    await prisma.$transaction(async (tx) => {
      const resultado = await CategoriaRepository.updatePrioridades(actualizaciones, tx as any)
      conflictos = resultado.conflictos

      if (conflictos.length > 0) {
        throw new Error('OCC_CONFLICT')
      }

      // Audit log solo para los que efectivamente cambiaron de prioridad
      for (const { id, prioridad } of actualizaciones) {
        const anterior = categoriasActuales.find(c => c.id === id)!
        if (anterior.prioridad !== prioridad) {
          const { antes, despues } = computeDiff(
            CAMPOS_PRIORIDAD,
            anterior as any,
            { ...anterior, prioridad } as any,
          )
          await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
        }
      }
    }).catch((err: Error) => {
      if (err.message !== 'OCC_CONFLICT') throw err
    })

    if (conflictos.length > 0) {
      return { ok: false, error: 'OCC_CONFLICT' }
    }

    return { ok: true, data: undefined }
  },
}
