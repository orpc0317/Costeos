/**
 * tipo-combo.service.ts — Lógica de negocio para Tipos de Combo.
 *
 * Responsabilidades:
 * - Join manual con Empresa para resolver empresaNombre
 * - Validación de duplicados y similares
 * - Atomicidad (registro + audit log)
 * - OCC validation via registroVersion
 */

import { prisma } from '@/lib/prisma'
import { TipoComboRepository } from '@/lib/repositories/tipo-combo.repository'
import { EmpresaRepository } from '@/lib/repositories/empresa.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import type { ActionResult } from '@/lib/types/common'
import type { TipoComboRow } from '@/lib/types/tipos-combo'

const TABLA = 'costeos_tipo_combo'

const CAMPOS_TIPO_COMBO = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'icono',  label: 'Icono' },
] as const

type TipoComboInput = {
  empresaId:  number
  nombre:     string
  icono?:     string | null
}

type TipoComboEditInput = TipoComboInput & {
  registroVersion: number
}

function toRow(r: Awaited<ReturnType<typeof TipoComboRepository.findById>>, empresaMap: Map<number, string>): TipoComboRow {
  if (!r) throw new Error('Registro no encontrado')
  return {
    ...r,
    empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
  }
}

export const TipoComboService = {

  async listar(): Promise<TipoComboRow[]> {
    const [rows, empresas] = await Promise.all([
      TipoComboRepository.findAll(),
      EmpresaRepository.findAll(),
    ])
    const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))
    return rows.map(r => ({
      ...r,
      empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
    }))
  },

  async crear(data: TipoComboInput, userId: number): Promise<ActionResult<TipoComboRow>> {
    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await TipoComboRepository.create({ ...data, usuarioCreo: userId }, tx as any)
      await AuditRepository.logCreate(TABLA, reg.id, userId, reg as any, tx as any)
      return reg
    })

    const empresa = await prisma.empresa.findUnique({
      where: { id: nuevo.empresaId },
      select: { nombre: true },
    })

    return {
      ok: true,
      data: {
        ...nuevo,
        empresaNombre: empresa?.nombre ?? `Empresa ${nuevo.empresaId}`,
      },
    }
  },

  async editar(id: number, data: TipoComboEditInput, userId: number): Promise<ActionResult<TipoComboRow>> {
    const anterior = await TipoComboRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Tipo de combo no encontrado' }

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await TipoComboRepository.update(id, data, tx as any)
      if (!reg) return null

      const { antes, despues } = computeDiff(CAMPOS_TIPO_COMBO, anterior as any, reg as any)
      if (Object.keys(antes).length > 0) {
        await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
      }
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: actualizado.empresaId },
      select: { nombre: true },
    })

    return {
      ok: true,
      data: {
        ...actualizado,
        empresaNombre: empresa?.nombre ?? `Empresa ${actualizado.empresaId}`,
      },
    }
  },

  async eliminar(id: number, registroVersion: number, userId: number): Promise<ActionResult<void>> {
    const anterior = await TipoComboRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Tipo de combo no encontrado' }

    const eliminado = await prisma.$transaction(async (tx) => {
      const ok = await TipoComboRepository.delete(id, registroVersion, tx as any)
      if (!ok) return false
      await AuditRepository.logDelete(TABLA, id, userId, anterior as any, tx as any)
      return true
    })

    if (!eliminado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: undefined }
  },

  /** Busca tipos con nombre exactamente igual en la misma empresa (para evitar duplicados). */
  async buscarDuplicado(nombre: string, empresaId: number, excludeId?: number): Promise<boolean> {
    const existente = await prisma.tipoCombo.findFirst({
      where: {
        empresaId,
        nombre,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    return !!existente
  },
}
