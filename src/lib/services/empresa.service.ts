/**
 * empresa.service.ts — Lógica de negocio para Empresas.
 */

import { prisma } from '@/lib/prisma'
import { EmpresaRepository } from '@/lib/repositories/empresa.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { EmpresaInput, EmpresaRow, CatalogoSyncRow } from '@/lib/types/empresas'
import { CATALOGOS_ERP } from '@/lib/types/empresas'

const TABLA = 'costeos_empresa'

// Campos de empresa con su label legible para el log histórico
const CAMPOS_EMPRESA = [
  { key: 'nombre',      label: 'Nombre' },
  { key: 'razonSocial', label: 'Razón Social' },
  { key: 'nit',         label: 'NIT' },
  { key: 'codigoErp',   label: 'Código ERP' },
] as const

function toRow(emp: any, catalogosSync: CatalogoSyncRow[]): EmpresaRow {
  return {
    id:              emp.id,
    nombre:          emp.nombre,
    razonSocial:     emp.razonSocial ?? '',
    nit:             emp.nit ?? '',
    codigoErp:       String(emp.codigoErp ?? ''),
    catalogosSync,
    usuarioCreo:     emp.usuarioCreo,
    fechaCreo:       emp.fechaCreo,
    registroVersion: emp.registroVersion,
  }
}

export const EmpresaService = {

  async listar(): Promise<EmpresaRow[]> {
    return EmpresaRepository.findAll()
  },

  async crear(data: EmpresaInput, userId: number): Promise<ActionResult<EmpresaRow>> {
    const nueva = await prisma.$transaction(async (tx) => {
      const emp = await EmpresaRepository.create(
        {
          nombre:      data.nombre,
          razonSocial: data.razonSocial,
          nit:         data.nit,
          codigoErp:   data.codigoErp,
        },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, emp.id, userId, emp as any, tx as any)
      return emp
    })

    return {
      ok:   true,
      data: toRow(nueva, []),
    }
  },

  /**
   * Actualiza empresa + catálogos de sincronización en una sola transacción,
   * generando UN ÚNICO registro de auditoría con el diff consolidado de todos
   * los campos que cambiaron (empresa + catálogos).
   */
  async actualizarCompleto(
    id: number,
    data: EmpresaInput & { registroVersion: number },
    catalogosSyncNuevos: CatalogoSyncRow[],
    userId: number,
  ): Promise<ActionResult<EmpresaRow>> {
    const anterior = await EmpresaRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Empresa no encontrada' }

    // ── Calcular diff consolidado ──────────────────────────────────────────────
    const antes:   Record<string, unknown> = {}
    const despues: Record<string, unknown> = {}

    // Campos de la empresa
    for (const { key, label } of CAMPOS_EMPRESA) {
      const valAntes   = (anterior as any)[key] ?? ''
      const valDespues = (data as any)[key] ?? ''
      if (String(valAntes) !== String(valDespues)) {
        antes[label]   = valAntes
        despues[label] = valDespues
      }
    }

    // Catálogos ERP
    for (const cat of catalogosSyncNuevos) {
      const syncAnterior  = anterior.configuracionesSync.find(c => c.catalogo === cat.catalogo)
      const valorAnterior = syncAnterior?.sincronizar ?? false
      if (valorAnterior !== cat.sincronizar) {
        const label = CATALOGOS_ERP.find(c => c.key === cat.catalogo)?.label ?? cat.catalogo
        antes[`Sync ${label}`]   = valorAnterior ? 'Sí' : 'No'
        despues[`Sync ${label}`] = cat.sincronizar ? 'Sí' : 'No'
      }
    }

    // ── Transacción única ──────────────────────────────────────────────────────
    const actualizada = await prisma.$transaction(async (tx) => {
      const emp = await EmpresaRepository.update(
        id,
        {
          nombre:          data.nombre,
          razonSocial:     data.razonSocial,
          nit:             data.nit,
          codigoErp:       data.codigoErp,
          registroVersion: data.registroVersion,
        },
        tx as any,
      )
      if (!emp) return null // OCC

      // Upsert de todos los catálogos recibidos
      for (const cat of catalogosSyncNuevos) {
        await EmpresaRepository.updateCatalogoSync(id, cat.catalogo, cat.sincronizar, tx as any)
      }

      // Un único log con todos los cambios (solo si algo cambió)
      if (Object.keys(antes).length > 0) {
        await AuditRepository.logUpdate(TABLA, id, userId, antes as any, despues as any, tx as any)
      }

      return emp
    })

    if (!actualizada) {
      return {
        ok:    false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return {
      ok:   true,
      data: toRow(actualizada, catalogosSyncNuevos),
    }
  },
}
