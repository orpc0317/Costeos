import { getEmpresas } from '@/app/actions/empresas'
import { EmpresasTable } from '@/components/empresas/empresas-table'
import { Building2 } from 'lucide-react'

export const metadata = {
  title: 'Empresas | Costeos',
}

export default async function EmpresasPage() {
  const data = await getEmpresas()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-900">
            <Building2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestione las empresas y su configuración de sincronización con el ERP.
          </p>
        </div>
      </div>

      <EmpresasTable data={data} />
    </div>
  )
}
