import { WizardCosteo } from './_wizard'
import { getEmpresasAction } from '@/app/actions/erp-actions'
import { getTiposCosteoActivosAction } from '@/app/actions/tipos-costeo-actions'
// import { auth } from '@/lib/auth'

export const metadata = {
  title: 'Nuevo Costeo | Costeos',
}

export default async function NuevoCosteoPage() {
  // const session = await auth()
  // const usuarioErp = session?.user?.email || 'admin' // Hardcoded temporal para pruebas
  const usuarioErp = 'ALGO' // TODO: Cambiar por el usuario_erp de la sesión real. Asumiendo "ALGO" para testing si ese es el default, u "oscar"

  // Fetch inicial
  const resEmpresas = await getEmpresasAction('oscar') 
  const resTipos = await getTiposCosteoActivosAction()

  return (
    <div className="mx-auto max-w-4xl py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Nuevo Costeo</h1>
      
      {resEmpresas.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {resEmpresas.error}
        </div>
      ) : (
        <WizardCosteo empresas={resEmpresas.data || []} tiposCosteo={resTipos.data || []} />
      )}
    </div>
  )
}
