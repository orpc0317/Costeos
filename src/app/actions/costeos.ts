'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requirePermiso, puedeConsultar } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { ESTADO_CONTRATO, ESTADO_COSTEO, labelEstadoContrato } from '@/lib/constants'
import { costeoParaAbrir } from '@/lib/costeo-abrir'
import { redirect } from 'next/navigation'

/** Siguiente correlativo de la empresa. Atómico por fila de empresa. */
async function siguienteNumeroContrato(tx: Prisma.TransactionClient, empresaId: number): Promise<string> {
  await tx.$executeRaw`
    INSERT INTO costeos_contrato_correlativo (empresa_id, ultimo)
    VALUES (${empresaId}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE ultimo = LAST_INSERT_ID(ultimo + 1)
  `
  const filas = await tx.$queryRaw<Array<{ n: bigint | number }>>`SELECT LAST_INSERT_ID() AS n`
  const numero = Number(filas[0]?.n ?? 0)
  if (!Number.isInteger(numero) || numero < 1) {
    throw new Error('No se pudo asignar el numero de contrato')
  }
  return String(numero)
}

function parseFecha(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null
  const fecha = new Date(`${valor}T00:00:00.000Z`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

function fechaCorta(fecha: Date): string {
  const dia = String(fecha.getUTCDate()).padStart(2, '0')
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${fecha.getUTCFullYear()}`
}

export type ContratoExistente = {
  id: number
  nombre: string
  numero: string
  fechaCosteo: string
  fechaInicio: string
  estado: number
  estadoLabel: string
  costeoId: number | null
  version: number | null
}

/** Contratos del cliente en Costeos. No consulta el ERP. */
export async function buscarContratosDeCliente(
  empresaId: number,
  clienteId: number,
): Promise<ContratoExistente[]> {
  if (!(await puedeConsultar(PERMISOS.COS_NEW))) return []
  if (!empresaId || !clienteId) return []

  const rows = await prisma.contrato.findMany({
    where: { empresaId, clienteId },
    select: {
      id: true,
      nombre: true,
      numero: true,
      fechaInicio: true,
      estado: true,
      costeos: {
        select: { id: true, version: true, estado: true, fechaCosteo: true },
        orderBy: { version: 'desc' },
      },
    },
    orderBy: { fechaInicio: 'desc' },
  })

  return rows.map(row => {
    const elegido = costeoParaAbrir(row.costeos)
    return {
      id: row.id,
      nombre: row.nombre,
      numero: row.numero,
      fechaCosteo: elegido ? fechaCorta(elegido.fechaCosteo) : '—',
      fechaInicio: fechaCorta(row.fechaInicio),
      estado: row.estado,
      estadoLabel: labelEstadoContrato(row.estado),
      costeoId: elegido?.id ?? null,
      version: elegido?.version ?? null,
    }
  })
}

export async function createCosteo(formData: FormData) {
  const guard = await requirePermiso(PERMISOS.COS_NEW, 'agregar')
  if (!guard.ok) throw new Error(guard.error)

  const erpClienteDataStr = formData.get('erpClienteData') as string
  const isNewClient = formData.get('isNewClient') === 'true'
  const nombreProyecto = formData.get('nombreProyecto') as string
  const plazoMeses = formData.get('plazoMeses') as string
  const moneda = formData.get('moneda') as string
  const fechaCosteo = parseFecha(String(formData.get('fechaCosteo') ?? ''))
  const fechaInicio = parseFecha(String(formData.get('fechaInicio') ?? ''))

  // Validaciones
  if (!erpClienteDataStr || !nombreProyecto || !plazoMeses || !moneda || !fechaCosteo || !fechaInicio) {
    throw new Error('Faltan campos requeridos')
  }

  const clienteData: {
    fuente?: 'LOCAL' | 'ERP'
    clienteLocalId?: number
    id?: string           // codigoErp en el ERP
    codigo?: string
    nit: string
    razonSocial: string
    direccion?: string
    departamentoId?: number
    municipioId?: number
    diasCredito?: number
  } = JSON.parse(erpClienteDataStr)

  const esClienteLocal = clienteData.fuente === 'LOCAL' && Number(clienteData.clienteLocalId) > 0
  if (!esClienteLocal) {
    const altaCliente = await requirePermiso(PERMISOS.CLI_CAT, 'agregar')
    if (!altaCliente.ok) throw new Error(altaCliente.error)
  }

  const userId = guard.userId

  const result = await prisma.$transaction(async (tx) => {
    const empresaIdNum = parseInt(formData.get('empresa') as string || '0', 10)

    let clienteLocal

    if (clienteData.fuente === 'LOCAL' && clienteData.clienteLocalId) {
      // ── Cliente ya existe en Costeos — ir directo por ID ──────────────────────
      // No hay nada que crear. El registro ya está completo en la BD local.
      clienteLocal = await tx.cliente.findUnique({ where: { id: clienteData.clienteLocalId } })
      if (!clienteLocal) throw new Error('Cliente local no encontrado')

    } else if (isNewClient) {
      // ── Cliente nuevo (digitado manualmente) ─────────────────────────────────
      const codigoTemp = `TEMP-${Date.now()}`
      clienteLocal = await tx.cliente.create({
        data: {
          empresaId:       empresaIdNum,
          codigoTemp:      codigoTemp,
          nit:             clienteData.nit,
          razonSocial:     clienteData.razonSocial,
          direccionFiscal: clienteData.direccion ?? null,
        }
      })

    } else {
      // ── Cliente del ERP: buscar o crear por codigoErp ─────────────────────────
      const codigoErp = clienteData.id ?? clienteData.codigo ?? null

      clienteLocal = codigoErp
        ? await tx.cliente.findFirst({ where: { codigoErp, empresaId: empresaIdNum } })
        : null

      if (!clienteLocal) {
        // Crear en Costeos con todos los datos disponibles del ERP
        clienteLocal = await tx.cliente.create({
          data: {
            empresaId:               empresaIdNum,                      // P1: asignar empresa
            codigoErp:               codigoErp,
            nit:                     clienteData.nit,
            razonSocial:             clienteData.razonSocial,
            direccionFiscal:         clienteData.direccion ?? null,
            direccionPaisId:         1,                                 // P2: Guatemala
            direccionDepartamentoId: clienteData.departamentoId ?? 0,   // P2: del ERP
            direccionMunicipioId:    clienteData.municipioId ?? 0,      // P2: del ERP
            diasCredito:             clienteData.diasCredito ?? 0,      // P2: del ERP
            sincronizadoEn:          new Date(),                        // marca importación ERP
          }
        })
      } else {
        // Actualizar con datos frescos del ERP (sincronización)
        clienteLocal = await tx.cliente.update({
          where: { id: clienteLocal.id },
          data: {
            nit:                     clienteData.nit,
            razonSocial:             clienteData.razonSocial,
            direccionFiscal:         clienteData.direccion ?? null,
            // Solo actualizar geo si el ERP trae datos (no pisar datos locales con 0)
            ...(clienteData.departamentoId ? { direccionDepartamentoId: clienteData.departamentoId } : {}),
            ...(clienteData.municipioId    ? { direccionMunicipioId:    clienteData.municipioId }    : {}),
            ...(clienteData.diasCredito != null ? { diasCredito: clienteData.diasCredito }           : {}),
            sincronizadoEn: new Date(),
          }
        })
      }
    }


    const contrato = await tx.contrato.create({
      data: {
        clienteId: clienteLocal.id,
        empresaId: empresaIdNum,
        numero: await siguienteNumeroContrato(tx, empresaIdNum),
        nombre: nombreProyecto,
        fechaContrato: new Date(),
        fechaInicio,
        plazoMeses: parseInt(plazoMeses, 10),
        moneda: moneda,
        estado: ESTADO_CONTRATO.BORRADOR,
        creadoPor: userId,
      }
    })

    const tipoCosteoIdStr = formData.get('tipoCosteoId') as string
    const tipoCosteoId = tipoCosteoIdStr ? parseInt(tipoCosteoIdStr, 10) : undefined
    const costeo = await tx.costeo.create({
      data: {
        contratoId: contrato.id,
        tipoCosteoId,
        fechaCosteo,
        fechaInicio,
        version: 1,
        estado: ESTADO_COSTEO.BORRADOR,
        creadoPor: userId,
      }
    })

    return costeo
  })

  redirect(`/costeos/${result.id}/builder`)
}
