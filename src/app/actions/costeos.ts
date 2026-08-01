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
    let clienteLocal
    
    if (isNewClient) {
      const codigoTemp = `TEMP-${Date.now()}`
      clienteLocal = await tx.cliente.create({
        data: {
          codigoTemp: codigoTemp,
          nit: erpCliente.nit,
          razonSocial: erpCliente.razonSocial,
          direccionFiscal: erpCliente.direccion,
          esNuevo: true,
        }
      })
    } else {
      clienteLocal = await tx.cliente.findFirst({
        where: { erpClienteId: erpCliente.id }
      })

      if (!clienteLocal) {
        clienteLocal = await tx.cliente.create({
          data: {
            erpClienteId: erpCliente.id,
            nit: erpCliente.nit,
            razonSocial: erpCliente.razonSocial,
            direccionFiscal: erpCliente.direccion,
            esNuevo: false,
          }
        })
      } else {
        clienteLocal = await tx.cliente.update({
          where: { id: clienteLocal.id },
          data: {
            nit: erpCliente.nit,
            razonSocial: erpCliente.razonSocial,
            direccionFiscal: erpCliente.direccion,
          }
        })
      }
    }

    const empresaId = formData.get('empresa') as string
    
    const contrato = await tx.contrato.create({
      data: {
        clienteId: clienteLocal.id,
        empresaId: empresaId ? parseInt(empresaId, 10) : 1,
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
