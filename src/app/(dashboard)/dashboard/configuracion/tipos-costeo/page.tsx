import { getTiposCosteoAction } from '@/app/actions/tipos-costeo-actions'
import { TiposCosteoClient } from './tipos-costeo-client'

export const metadata = {
  title: 'Tipos de Costeo | Configuración',
}

export default async function TiposCosteoPage() {
  const res = await getTiposCosteoAction()
  const data = res.data || []

  return (
    <div className="space-y-6">
      <TiposCosteoClient data={data} />
    </div>
  )
}
