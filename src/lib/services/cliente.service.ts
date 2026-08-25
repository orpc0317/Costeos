/**
 * cliente.service.ts — Lógica de negocio para Clientes.
 *
 * Responsabilidades:
 * - Atomicidad (registro + audit log)
 * - OCC validation
 */

import { prisma } from '@/lib/prisma'
import { erp } from '@/lib/erp'
import { ClienteRepository } from '@/lib/repositories/cliente.repository'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { computeDiff } from '@/lib/utils/audit'
import type { ActionResult } from '@/lib/types/common'
import type { ClienteInput, ClienteRow } from '@/lib/types/clientes'

const TABLA = 'costeos_cliente'


/**
 * Construye el array de campos auditables incluyendo Empresa, País, Departamento y Municipio
 * con sus nombres resueltos, evitando que se registren códigos numéricos en el historial.
 */
async function buildCamposAuditables(
  anteriorDeptId: number,
  anteriorMuniId: number,
  nuevoDeptId:    number,
  nuevoMuniId:    number,
) {
  // IDs de departamento involucrados (anterior y nuevo)
  const deptoIds = [...new Set([anteriorDeptId, nuevoDeptId].filter(Boolean))]

  const empresaMap = new Map<number, string>()
  const deptosMap  = new Map<number, string>()
  const munisMap   = new Map<number, string>()

  try {
    const [empresas, deptos] = await Promise.all([
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
      erp.getDepartamentos('GT'),
    ])
    empresas.forEach(e => empresaMap.set(e.id, e.nombre))
    deptos.forEach(d => deptosMap.set(d.codigo, d.nombre))

    await Promise.all(deptoIds.map(async dId => {
      const munis = await erp.getMunicipios(dId, 'GT')
      munis.forEach(m => munisMap.set(m.codigo, m.nombre))
    }))
  } catch {
    // Si el ERP no responde, registrar el código como fallback
  }

  const resolverEmpresa = (val: unknown) => {
    const id = Number(val)
    return empresaMap.get(id) ?? (id ? String(id) : '—')
  }
  const resolverDepto = (val: unknown) => {
    const id = Number(val)
    return deptosMap.get(id) ?? (id ? String(id) : '—')
  }
  const resolverMuni = (val: unknown) => {
    const id = Number(val)
    return munisMap.get(id) ?? (id ? String(id) : '—')
  }

  return [
    { key: 'empresaId'            as const, label: 'Empresa',       transform: resolverEmpresa },
    { key: 'nit'                  as const, label: 'NIT' },
    { key: 'razonSocial'          as const, label: 'Razón Social' },
    { key: 'direccionFiscal'      as const, label: 'Dirección Fiscal' },
    { key: 'diasCredito'          as const, label: 'Días Crédito' },
    { key: 'codigoErp'            as const, label: 'Código ERP' },
    { key: 'direccionPaisId'         as const, label: 'País',         transform: () => 'GUATEMALA' },
    { key: 'direccionDepartamentoId' as const, label: 'Departamento', transform: resolverDepto },
    { key: 'direccionMunicipioId'    as const, label: 'Municipio',    transform: resolverMuni },
  ]
}


export const ClienteService = {

  async listar(): Promise<ClienteRow[]> {
    const [rows, empresas] = await Promise.all([
      ClienteRepository.findAll(),
      prisma.empresa.findMany({ select: { id: true, nombre: true } }),
    ])
    const empresaMap = new Map(empresas.map(e => [e.id, e.nombre]))
    return rows.map(r => ({
      ...r,
      empresaNombre: empresaMap.get(r.empresaId) ?? `Empresa ${r.empresaId}`,
    }))
  },

  async crear(data: ClienteInput, userId: number): Promise<ActionResult<ClienteRow>> {
    // Resolver nombres de empresa, departamento y municipio ANTES de la transacción
    // para que el log de auditoría muestre nombres legibles, no códigos numéricos.
    const camposAuditables = await buildCamposAuditables(
      0, 0,
      data.direccionDepartamentoId ?? 0,
      data.direccionMunicipioId ?? 0,
    )

    const nuevo = await prisma.$transaction(async (tx) => {
      const reg = await ClienteRepository.create(
        {
          empresaId:               data.empresaId,
          nit:                     data.nit,
          razonSocial:             data.razonSocial,
          direccionFiscal:         data.direccionFiscal,
          direccionPaisId:         data.direccionPaisId ?? 0,
          direccionDepartamentoId: data.direccionDepartamentoId ?? 0,
          direccionMunicipioId:    data.direccionMunicipioId ?? 0,
          diasCredito:             data.diasCredito ?? 0,
          codigoErp:               data.codigoErp ?? null,
        },
        userId,
        tx as any,
      )

      // Construir datosDespues con nombres legibles usando los campos auditables resueltos
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
    return { ok: true, data: nuevo as ClienteRow }
  },


  async actualizar(
    id: number,
    data: ClienteInput & { registroVersion: number },
    userId: number,
  ): Promise<ActionResult<ClienteRow>> {
    const anterior = await ClienteRepository.findById(id)
    if (!anterior) return { ok: false, error: 'Cliente no encontrado' }

    // Resolver nombres de departamento/municipio ANTES de la transacción
    // para que el diff de auditoría muestre nombres legibles, no códigos.
    const camposAuditables = await buildCamposAuditables(
      anterior.direccionDepartamentoId,
      anterior.direccionMunicipioId,
      data.direccionDepartamentoId ?? 0,
      data.direccionMunicipioId ?? 0,
    )

    const actualizado = await prisma.$transaction(async (tx) => {
      const reg = await ClienteRepository.update(
        id,
        {
          nit:                     data.nit,
          razonSocial:             data.razonSocial,
          direccionFiscal:         data.direccionFiscal,
          direccionPaisId:         data.direccionPaisId ?? 0,
          direccionDepartamentoId: data.direccionDepartamentoId ?? 0,
          direccionMunicipioId:    data.direccionMunicipioId ?? 0,
          diasCredito:             data.diasCredito ?? 0,
          codigoErp:               data.codigoErp ?? null,
          registroVersion:         data.registroVersion,
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

    return { ok: true, data: actualizado as ClienteRow }
  },
}
