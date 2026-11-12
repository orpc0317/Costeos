import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmpresasForUser } from '@/app/actions/erp'
import { ContratosClient, type ContratoListRow } from './contratos-client'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { costeoParaAbrir } from '@/lib/costeo-abrir'

export const metadata = {
  title: 'Contratos',
}

function fechaCorta(fecha: Date): string {
  const dia = String(fecha.getUTCDate()).padStart(2, '0')
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${fecha.getUTCFullYear()}`
}

export default async function ContratosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const contratosDB = await prisma.contrato.findMany({
    include: {
      cliente: true,
      costeos: { select: { id: true, version: true, estado: true } },
    },
    orderBy: { modificadoEn: 'desc' },
  })

  const empresas = await getEmpresasForUser().catch(() => [])
  const empresasMap = new Map(empresas.map(e => [e.id, e.nombre]))

  const contratos: ContratoListRow[] = contratosDB.map((contrato) => {
    const costeo = costeoParaAbrir(contrato.costeos)
    return {
      id: contrato.id,
      numero: contrato.numero,
      empresaNombre: empresasMap.get(contrato.empresaId) || `Empresa ${contrato.empresaId}`,
      fechaContrato: fechaCorta(contrato.fechaContrato),
      clienteRazonSocial: contrato.cliente.razonSocial,
      nombre: contrato.nombre,
      fechaInicio: fechaCorta(contrato.fechaInicio),
      estado: contrato.estado,
      costeoId: costeo?.id ?? null,
      costeoEstado: costeo?.estado ?? null,
    }
  })

  const permisos = await getPermisosDetalle(PERMISOS.COS_CAT)
  return (
    <ContratosClient contratos={contratos} permisos={permisos} />
  )
}
