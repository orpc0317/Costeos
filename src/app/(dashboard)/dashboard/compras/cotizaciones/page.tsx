import { listarTodasCotizaciones } from '@/app/actions/solicitudes'
import { getPermisosDetalle } from '@/app/actions/permisos'
import { PERMISOS } from '@/lib/permisos'
import { CotizacionesClient } from './cotizaciones-client'

export default async function CotizacionesPage() {
  const [cotizaciones, permisos] = await Promise.all([
    listarTodasCotizaciones(),
    getPermisosDetalle(PERMISOS.COT_COM),
  ])
  return <CotizacionesClient cotizaciones={cotizaciones} permisos={permisos} />
}
