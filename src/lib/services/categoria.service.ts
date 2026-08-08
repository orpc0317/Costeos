/**
 * categoria.service.ts — Lógica de negocio para Categorías de Items.
 *
 * Responsabilidades:
 * - Generación de código secuencial por empresa
 * - Validación de duplicados (código único)
 * - Garantizar atomicidad (registro + audit log en una transacción)
 * - Validación de Concurrencia Optimística (OCC)
 *
 * NO hace: auth, validación Zod, revalidatePath. Eso lo hace el Action.
 */

import { prisma } from '@/lib/prisma'
import { CategoriaRepository } from '@/lib/repositories/categoria.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { CategoriaInput, CategoriaRow } from '@/lib/types/categorias'

const TABLA = 'costeos_categoria'

export const CategoriaService = {

  async listar(): Promise<CategoriaRow[]> {
    const rows = await CategoriaRepository.findAll()
    return rows.map(r => ({
      ...r,
      empresaNombre: r.empresa?.nombre ?? `Empresa ${r.empresaId}`,
    }))
  },

  async crear(data: CategoriaInput, userId: number): Promise<ActionResult<CategoriaRow>> {
    // Lógica de negocio: generar código correlativo por empresa
    let codigo = data.codigo

    if (!codigo) {
      const count = await CategoriaRepository.countByEmpresa(data.empresaId)
      codigo = count + 1
    }

    // Verificar unicidad del código
    const existe = await CategoriaRepository.findByCodigo(codigo)
    if (existe) {
      return { ok: false, error: 'El código de categoría ya existe', field: 'codigo' }
    }

    // Atomicidad: crear registro + audit log en la misma transacción
    const nueva = await prisma.$transaction(async (tx) => {
      const reg = await CategoriaRepository.create(
        { empresaId: data.empresaId, codigo, nombre: data.nombre, prioridad: data.prioridad ?? false, activo: data.activo ?? true },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, reg.id, userId, reg as any, tx as any)
      return reg
    })

    return {
      ok: true,
      data: {
        ...nueva,
        empresaNombre: undefined,
      } as CategoriaRow,
    }
  },

  async actualizar(id: number, data: CategoriaInput, userId: number): Promise<ActionResult<CategoriaRow>> {
    // Verificar que el registro existe
    const anterior = await CategoriaRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Categoría no encontrada' }

    // Verificar código duplicado (excluyendo el propio registro)
    if (data.codigo) {
      const existente = await CategoriaRepository.findByCodigoExcluding(data.codigo, id)
      if (existente) {
        return { ok: false, error: 'El código de categoría ya existe en otro registro', field: 'codigo' }
      }
    }

    // Atomicidad: actualizar + audit log
    const actualizada = await prisma.$transaction(async (tx) => {
      const reg = await CategoriaRepository.update(
        id,
        {
          empresaId: data.empresaId,
          ...(data.codigo ? { codigo: data.codigo } : {}),
          nombre: data.nombre,
          prioridad: data.prioridad ?? false,
          activo: data.activo ?? true,
          registroVersion: anterior.registroVersion,
        },
        tx as any,
      )
      if (!reg) return null // OCC — otro usuario modificó el registro
      await AuditRepository.logUpdate(TABLA, id, userId, anterior as any, reg as any, tx as any)
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
}
