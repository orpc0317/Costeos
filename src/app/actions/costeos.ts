'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function createCosteo(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('No autorizado')
  }

  const erpClienteDataStr = formData.get('erpClienteData') as string
  const isNewClient = formData.get('isNewClient') === 'true'
  const nombreProyecto = formData.get('nombreProyecto') as string
  const plazoMeses = formData.get('plazoMeses') as string
  const moneda = formData.get('moneda') as string

  // Validaciones
  if (!erpClienteDataStr || !nombreProyecto || !plazoMeses || !moneda) {
    throw new Error('Faltan campos requeridos')
  }

  const erpCliente = JSON.parse(erpClienteDataStr)

  const userId = parseInt(session.user.id as string, 10)

  const result = await prisma.$transaction(async (tx) => {
    // Parsear datos del cliente (puede incluir fuente/clienteLocalId del nuevo wizard)
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
        numero: `TEMP-${Date.now()}`,
        nombre: nombreProyecto,
        fechaInicio: new Date(),
        plazoMeses: parseInt(plazoMeses, 10),
        moneda: moneda,
        estado: 'BORRADOR',
        creadoPor: userId,
      }
    })

    const tipoCosteoIdStr = formData.get('tipoCosteoId') as string
    const tipoCosteoId = tipoCosteoIdStr ? parseInt(tipoCosteoIdStr, 10) : undefined
    const costeo = await tx.costeo.create({
      data: {
        contratoId: contrato.id,
        tipoCosteoId,
        version: 1,
        estado: 'BORRADOR',
        creadoPor: userId,
      }
    })

    return costeo
  })

  redirect(`/costeos/${result.id}/builder`)
}
