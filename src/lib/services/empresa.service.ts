/**
 * empresa.service.ts — Lógica de negocio para Empresas.
 */

import { prisma } from '@/lib/prisma'
import { EmpresaRepository } from '@/lib/repositories/empresa.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import type { ActionResult } from '@/lib/types/common'
import type { EmpresaInput, EmpresaRow } from '@/lib/types/empresas'

const TABLA = 'costeos_empresa'

function toRow(emp: any, syncItems: boolean, syncCategorias: boolean): EmpresaRow {
  return {
    id:                   emp.id,
    nombre:               emp.nombre,
    razonSocial:          emp.razonSocial ?? '',
    nit:                  emp.nit ?? '',
    codigoErp:            String(emp.codigoErp ?? ''),
    sincronizarItems:     syncItems,
    sincronizarCategorias: syncCategorias,
    usuarioCreo:          emp.usuarioCreo,
    fechaCreo:            emp.fechaCreo,
    registroVersion:      emp.registroVersion,
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
          nombre:               data.nombre,
          razonSocial:          data.razonSocial,
          nit:                  data.nit,
          codigoErp:            data.codigoErp,
          sincronizarItems:     data.sincronizarItems,
          sincronizarCategorias: data.sincronizarCategorias,
        },
        userId,
        tx as any,
      )
      await AuditRepository.logCreate(TABLA, emp.id, userId, emp as any, tx as any)
      return emp
    })

    return {
      ok: true,
      data: toRow(nueva, data.sincronizarItems, data.sincronizarCategorias),
    }
  },

  async actualizar(id: number, data: EmpresaInput & { registroVersion: number }, userId: number): Promise<ActionResult<EmpresaRow>> {
    const anterior = await EmpresaRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Empresa no encontrada' }

    const actualizada = await prisma.$transaction(async (tx) => {
      const emp = await EmpresaRepository.update(
        id,
        {
          nombre:               data.nombre,
          razonSocial:          data.razonSocial,
          nit:                  data.nit,
          codigoErp:            data.codigoErp,
          sincronizarItems:     data.sincronizarItems,
          sincronizarCategorias: data.sincronizarCategorias,
          registroVersion:      data.registroVersion,
        },
        tx as any,
      )
      if (!emp) return null
      await AuditRepository.logUpdate(TABLA, id, userId, anterior as any, emp as any, tx as any)
      return emp
    })

    if (!actualizada) {
      return {
        ok: false,
        error: 'El registro fue modificado por otro usuario. Recarga la información e intenta de nuevo.',
      }
    }

    return {
      ok: true,
      data: toRow(actualizada, data.sincronizarItems, data.sincronizarCategorias),
    }
  },
}
