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

  const result = await prisma.$transaction(async (tx) => {
    let clienteLocal
    
    if (isNewClient) {
      // 1A. Es un cliente nuevo manual
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
      // 1B. Upsert del Cliente (Sincronizarlo localmente desde el ERP)
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

    // 2. Crear el Contrato usando el ID del clienteLocal
    const empresaId = formData.get('empresa') as string
    
    const contrato = await tx.contrato.create({
      data: {
        clienteId: clienteLocal.id,
        empresaId: empresaId ? parseInt(empresaId, 10) : 1,
        numero: `TEMP-${Date.now()}`, // Esto se sustituirá al sincronizar con el ERP
        nombre: nombreProyecto,
        fechaInicio: new Date(),
        plazoMeses: parseInt(plazoMeses, 10),
        moneda: moneda,
        estado: 'BORRADOR',
        creadoPor: parseInt(session.user.id as string, 10),
      }
    })

    // 3. Crear el Costeo asociado
    const tipoCosteoIdStr = formData.get('tipoCosteoId') as string
    const tipoCosteoId = tipoCosteoIdStr ? parseInt(tipoCosteoIdStr, 10) : undefined
    const costeo = await tx.costeo.create({
      data: {
        contratoId: contrato.id,
        tipoCosteoId,
        version: 1,
        estado: 'BORRADOR',
        creadoPor: parseInt(session.user.id as string, 10),
      }
    })

    // 4. Crear nodos por defecto si el tipo de costeo deshabilita niveles
    if (tipoCosteoId) {
      const tc = await tx.tipoCosteo.findUnique({ where: { id: tipoCosteoId } })
      if (tc) {
        if (!tc.nivel1Activo) {
          // Crear Sitio por defecto y Puesto por defecto
          const sitio = await tx.sitio.create({
            data: { contratoId: contrato.id, nombre: 'DEFAULT', codigo: 'DEF' }
          })
          await tx.puesto.create({
            data: { sitioId: sitio.id, nombre: 'DEFAULT', codigo: 'DEF', diasCobertura: 'LUN-DOM', horaInicio: '00:00', horaFin: '23:59' }
          })
        } else if (!tc.nivel2Activo) {
          // No nivel 2: pero el nivel 1 lo crea el usuario. Wait, if the user creates a Nivel 1 (Sitio), 
          // they won't see Nivel 2, so the system must automatically create a Default Nivel 2 (Puesto) inside that Sitio when the Sitio is created.
        }
      }
    }

    return costeo
  })

  // Redirigir al builder
  redirect(`/costeos/${result.id}/builder`)
}
