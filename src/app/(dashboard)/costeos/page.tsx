import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmpresasForUser } from '@/app/actions/erp'
import { CosteosClient, type CosteoListRow } from './costeos-client'

export const metadata = {
  title: 'Costeos | Costeos',
}

export default async function CosteosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Obtener costeos (que están amarrados a contratos)
  const costeosDB = await prisma.costeo.findMany({
    include: {
      contrato: {
        include: {
          cliente: true
        }
      }
    },
    orderBy: {
      modificadoEn: 'desc'
    }
  })

  // Obtener catálogo de empresas para mapear el ID al Nombre
  const empresas = await getEmpresasForUser().catch(() => [])
  const empresasMap = new Map(empresas.map(e => [e.id, e.nombre]))

  const costeos: CosteoListRow[] = costeosDB.map((c) => ({
    id: c.id,
    codigoErp: c.contrato.erpContratoId,
    empresaNombre: empresasMap.get(c.contrato.empresaId) || `Empresa ${c.contrato.empresaId}`,
    proyectoNombre: c.contrato.nombre,
    clienteRazonSocial: c.contrato.cliente.razonSocial,
    estado: c.estado,
    version: c.version,
    modificadoEn: c.modificadoEn,
  }))

  return (
    <CosteosClient costeos={costeos} />
  )
}
