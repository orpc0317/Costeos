import { listarTodasCotizaciones } from '@/app/actions/solicitudes'
import { CotizacionesClient } from './cotizaciones-client'

export default async function CotizacionesPage() {
  const cotizaciones = await listarTodasCotizaciones()
  return <CotizacionesClient cotizaciones={cotizaciones} />
}
