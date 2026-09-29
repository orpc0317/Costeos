/**
 * proveedor.service.ts — Lógica de negocio para Proveedores.
 *
 * Responsabilidades:
 * - Atomicidad (registro + audit log)
 * - OCC validation
 */

import { prisma } from '@/lib/prisma'
import { ProveedorRepository } from '@/lib/repositories/proveedor.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import type { ActionResult } from '@/lib/types/common'
import type { ProveedorInput, ProveedorRow } from '@/lib/types/proveedores'

const TABLA = 'costeos_proveedor'

/**
 * Construye campos auditables con nombre de Empresa resuelto.
 */
async function buildCamposAuditables() {
  const empresaMap = new Map<number, string>()

  try {
    const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } })
    empresas.forEach(e => empresaMap.set(e.id, e.nombre))
  } catch {
    // Si falla, los IDs de empresa quedan como números
  }

  const resolverEmpresa = (val: unknown) => {
    const id = Number(val)
    return empresaMap.get(id) ?? (id ? String(id) : '—')
  }

  return [
    { key: 'empresaId' as const, label: 'Empresa',    transform: resolverEmpresa },
    { key: 'nit'       as const, label: 'NIT' },
    { key: 'nombre'    as const, label: 'Nombre' },
    { key: 'contacto'  as const, label: 'Contacto' },
    { key: 'telefono'  as const, label: 'Teléfono' },
    { key: 'email'     as const, label: 'Email' },
    { key: 'codigoErp' as const, label: 'Código ERP' },
  ]
}


export const ProveedorService = {

  async listar(): Promise<ProveedorRow[]> {
    const [rows, empresas] = await Promise.all([
      ProveedorRepository.findAll(),
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
    ])
    const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))
    return rows.map(r => ({
      ...r,
      empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
    }))
  },

  async crear(data: ProveedorInput, userId: number): Promise<ActionResult<ProveedorRow>> {
    const camposAuditables = await buildCamposAuditables()

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ProveedorRepository.create(
        {
          empresaId: data.empresaId,
          nit:       data.nit,
          nombre:    data.nombre,
          contacto:  data.contacto ?? null,
          telefono:  data.telefono ?? null,
          email:     data.email    ?? null,
          codigoErp: data.codigoErp ?? null,
        },
        userId,
        tx as any,
      )

      const datosDespues: Record<string, unknown> = {}
      for (const campo of camposAuditables) {
        const val = (reg as any)[campo.key]
        datosDespues[campo.label] = 'transform' in campo && campo.transform
          ? (campo.transform as (v: unknown) => unknown)(val)
          : val
      }

      await AuditRepository.logCreate(TABLA, reg.id, userId, datosDespues, tx as any)
      return reg
    })
    return { ok: true, data: nuevo as ProveedorRow }
  },

  async actualizar(
    id: number,
    data: ProveedorInput & { registroVersion: number },
    userId: number,
  ): Promise<ActionResult<ProveedorRow>> {
    const anterior = await ProveedorRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Proveedor no encontrado' }

    const camposAuditables = await buildCamposAuditables()

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await ProveedorRepository.update(
        id,
        {
          nit:             data.nit,
          nombre:          data.nombre,
          contacto:        data.contacto ?? null,
          telefono:        data.telefono ?? null,
          email:           data.email    ?? null,
          codigoErp:       data.codigoErp ?? null,
          registroVersion: data.registroVersion,
        },
        tx as any,
      )
      if (!reg) return null

      const { antes, despues } = computeDiff(camposAuditables as any, anterior as any, reg as any)
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

    return { ok: true, data: actualizado as ProveedorRow }
  },
}
