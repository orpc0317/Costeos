/**
 * tipo-costeo.service.ts — Lógica de negocio para Tipos de Costeo.
 *
 * Responsabilidades:
 * - Validación de "en uso" (no puede cambiar estructura si tiene costeos)
 * - Atomicidad (registro + audit log)
 * - OCC validation
 */

import { prisma } from '@/lib/prisma'
import { TipoCosteoRepository } from '@/lib/repositories/tipo-costeo.repository'
import { EmpresaRepository } from '@/lib/repositories/empresa.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import type { ActionResult } from '@/lib/types/common'
import type { TipoCosteoRow } from '@/lib/types/tipos-costeo'
import type { BaseEvaluacion } from '@prisma/client'

const TABLA = 'costeos_tipo_costeo'

/** Campos auditables con labels legibles (docs/conventions.md §16). */
const CAMPOS_TIPO_COSTEO = [
  { key: 'nombre',            label: 'Nombre' },
  { key: 'lineaEtiqueta',     label: 'Línea Etiqueta' },
  { key: 'cantidadNiveles',   label: 'Niveles' },
  { key: 'etiquetasNiveles',  label: 'Etiquetas Niveles' },
  { key: 'coloresNiveles',    label: 'Colores Niveles' },
  { key: 'iconosNiveles',     label: 'Iconos Niveles' },
  { key: 'nivelConDireccion', label: 'Nivel Dirección' },
  { key: 'baseEvaluacion',    label: 'Base Evaluación' },
  { key: 'manejoPlazo',       label: 'Manejo Plazo' },
  { key: 'fijarPlazo',        label: 'Fijar Plazo' },
] as const

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
  registroVersion: number
}

export const TipoCosteoService = {

  async listar(): Promise<TipoCosteoRow[]> {
    const [rows, empresas] = await Promise.all([
      TipoCosteoRepository.findAll(),
      EmpresaRepository.findAll(),
    ])
    const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))
    return rows.map(r => ({
      ...r,
      manejoPlazo: r.manejoPlazo as 'LIBRE' | 'FIJO' | 'NO_APLICA',
      empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
      enUso: r._count.costeos > 0,
    }))
  },

  async crear(data: TipoCosteoInput, userId: number): Promise<ActionResult<{ id: number }>> {
    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await TipoCosteoRepository.create(data, tx as any)
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

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await TipoCosteoRepository.update(id, data, tx as any)
      if (!reg) return null

      // Solo loguear los campos que realmente cambiaron, con labels legibles
      const { antes, despues } = computeDiff(CAMPOS_TIPO_COSTEO, tipoActual as any, reg as any)
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
      // Campo puntual — no necesita computeDiff (solo cambia `activo`)
      await AuditRepository.logUpdate(
        TABLA, id, userId,
        { Activo: tipo.activo ? 'Sí' : 'No' },
        { Activo: reg.activo  ? 'Sí' : 'No' },
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
