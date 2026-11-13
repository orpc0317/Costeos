import { WizardCosteo } from './_wizard'
import { getTiposCosteoActivosAction } from '@/app/actions/tipos-costeo'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'

export const metadata = {
  title: 'Nuevo Contrato',
}

export default async function NuevoCosteoPage() {
  const [tiposCosteo, permisosCliente] = await Promise.all([
    getTiposCosteoActivosAction(),
    getPermisosDetalle(PERMISOS.CLI_CAT),
  ])

  return <WizardCosteo tiposCosteo={tiposCosteo} puedeAgregarClientes={permisosCliente.agregar} />
}
