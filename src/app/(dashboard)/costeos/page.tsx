import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NuevoCosteoModal } from '@/components/costeos/modals/NuevoCosteoModal'
import { CosteosTableActions } from '@/components/costeos/CosteosTableActions'

export default async function CosteosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Obtener costeos (que están amarrados a contratos)
  const costeos = await prisma.costeo.findMany({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Costeos</h1>
          <p className="text-muted-foreground">Gestiona los costeos y presupuestos de tus contratos.</p>
        </div>
        <NuevoCosteoModal />
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="h-10 px-4 font-medium">Proyecto</th>
              <th className="h-10 px-4 font-medium">Cliente</th>
              <th className="h-10 px-4 font-medium">Estado</th>
              <th className="h-10 px-4 font-medium">Versión</th>
              <th className="h-10 px-4 font-medium">Actualizado</th>
              <th className="h-10 px-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {costeos.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay costeos creados.
                </td>
              </tr>
            ) : (
              costeos.map((costeo) => (
                <tr key={costeo.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">
                    {costeo.contrato.nombre}
                  </td>
                  <td className="p-4">
                    {costeo.contrato.cliente.razonSocial}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {costeo.estado}
                    </span>
                  </td>
                  <td className="p-4">
                    v{costeo.version}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(costeo.modificadoEn).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <CosteosTableActions costeoId={costeo.id} estado={costeo.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
