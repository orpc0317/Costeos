/**
 * tipo-costeo.service.ts — Lógica de negocio para Tipos de Costeo.
 *
 * Responsabilidades:
 * - Generación de código correlativo
 * - Validación de "en uso" (no puede cambiar estructura si tiene costeos)
 * - Validación de duplicados
 * - Atomicidad (registro + audit log)
 * - OCC validation
 */

import { prisma } from '@/lib/prisma'
import { TipoCosteoRepository } from '@/lib/repositories/tipo-costeo.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'
import type { BaseEvaluacion } from '@prisma/client'

const TABLA = 'costeos_tipo_costeo'

type TipoCosteoInput = {
  empresaId: number
  nombre: string
  cantidadNiveles: number
  etiquetasNiveles: string
  coloresNiveles: string
  iconosNiveles: string
  nivelConDireccion: number
  lineaEtiqueta: string
  baseEvaluacion: BaseEvaluacion
  manejoPlazo: string
  fijarPlazo: number
}

type TipoCosteoEditInput = TipoCosteoInput & {
  codigo: string
  registroVersion: number
}

export const TipoCosteoService = {

  async listar(): Promise<TipoCosteoRow[]> {
    const rows = await TipoCosteoRepository.findAll()
    return rows.map(r => ({
      ...r,
      manejoPlazo: r.manejoPlazo as 'LIBRE' | 'FIJO' | 'NO_APLICA',
      empresaNombre: `Empresa ${r.empresaId}`,
      enUso: r._count.costeos > 0,
    }))
  },

  async crear(data: TipoCosteoInput, userId: number): Promise<ActionResult<{ id: number }>> {
    // Generar código correlativo
    const count = await TipoCosteoRepository.countByEmpresa(data.empresaId)
    const codigo = String(count + 1).padStart(3, '0')

    // Verificar unicidad
    const existente = await TipoCosteoRepository.findByCodigoAndEmpresa(codigo, data.empresaId)
    if (existente) {
      return { ok: false, error: 'Error al generar el código, intente nuevamente' }
    }

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await TipoCosteoRepository.create({ ...data, codigo }, tx as any)
      await AuditRepository.logCreate(TABLA, reg.id, userId, reg as any, tx as any)
      return reg
    })

    return { ok: true, data: { id: nuevo.id } }
  },

  async editar(id: number, data: TipoCosteoEditInput, userId: number): Promise<ActionResult<TipoCosteoRow>> {
    const tipoActual = await TipoCosteoRepository.findById(id)
    if (!tipoActual) return { ok: false, error: 'Tipo de costeo no encontrado' }

    // Regla de negocio: no puede cambiar estructura si está en uso
    const enUso = (await TipoCosteoRepository.countCosteosAsociados(id)) > 0
    if (enUso) {
      if (
        data.cantidadNiveles !== tipoActual.cantidadNiveles ||
        data.baseEvaluacion !== tipoActual.baseEvaluacion ||
        data.nivelConDireccion !== tipoActual.nivelConDireccion
      ) {
        return {
          ok: false,
          error: 'El Tipo Costeo está en uso. No se puede alterar su estructura de niveles ni base evaluación.',
        }
      }
    }

    // Verificar código duplicado
    const duplicado = await TipoCosteoRepository.findByCodigoAndEmpresa(data.codigo, data.empresaId, id)
    if (duplicado) {
      return { ok: false, error: 'Ya existe un tipo de costeo con este código', field: 'codigo' }
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await TipoCosteoRepository.update(id, data, tx as any)
      if (!reg) return null
      await AuditRepository.logUpdate(TABLA, id, userId, tipoActual as any, reg as any, tx as any)
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return {
      ok: true,
      data: {
        ...(actualizado as any),
        manejoPlazo: (actualizado as any).manejoPlazo as 'LIBRE' | 'FIJO' | 'NO_APLICA',
        empresaNombre: `Empresa ${(actualizado as any).empresaId}`,
        enUso,
      },
    }
  },

  async toggleActivo(id: number, registroVersion: number, userId: number): Promise<ActionResult> {
    const tipo = await TipoCosteoRepository.findById(id)
    if (!tipo) return { ok: false, error: 'Tipo de costeo no encontrado' }

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await TipoCosteoRepository.toggleActivo(id, tipo.activo, registroVersion, tx as any)
      if (!reg) return null
      await AuditRepository.logUpdate(
        TABLA, id, userId,
        { activo: tipo.activo },
        { activo: reg.activo },
        tx as any,
      )
      return reg
    })

    if (!actualizado) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return { ok: true, data: undefined }
  },
}
