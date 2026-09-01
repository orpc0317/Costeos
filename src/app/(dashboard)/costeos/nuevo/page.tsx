import { WizardCosteo } from './_wizard'
import { getTiposCosteoActivosAction } from '@/app/actions/tipos-costeo'
// import { auth } from '@/lib/auth'

export const metadata = {
  title: 'Nuevo Costeo | Costeos',
}

export default async function NuevoCosteoPage() {
  // const session = await auth()
  // const usuarioErp = session?.user?.email || 'admin'
  const usuarioErp = 'ALGO' // TODO: Cambiar por el usuario_erp de la sesión real

  // Fetch inicial
  const tiposCosteo = await getTiposCosteoActivosAction()

  return <WizardCosteo tiposCosteo={tiposCosteo} />
}
