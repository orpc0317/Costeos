/**
 * ERP Repository — Implementación Fase C (API REST)
 *
 * Esta clase existe desde el día 1 pero los métodos lanzan NOT_IMPLEMENTED.
 * Cuando el ERP exponga los endpoints REST, se implementan los métodos aquí
 * y se cambia ERP_INTEGRATION_MODE=api en el servidor → pm2 restart costeos.
 *
 * ⚠️  NUNCA importar este archivo directamente desde Server Actions.
 *     Usar siempre: import { erp } from '@/lib/erp'
 *
 * ─── Checklist de migración Fase A → Fase C ──────────────────────────────────
 * [ ] ERP expone: GET  /api/costeos/items
 * [ ] ERP expone: POST /api/costeos/items/costos        (body: { ids: number[] })
 * [ ] ERP expone: POST /api/costeos/items/precios       (body: { ids: number[] })
 * [ ] ERP expone: GET  /api/costeos/items/:id/receta
 * [ ] ERP expone: GET  /api/costeos/clientes
 * [ ] ERP expone: POST /api/costeos/contratos-aprobados
 * [ ] Implementar cada método abajo (reemplazar el throw por el fetch real)
 * [ ] Cambiar ERP_INTEGRATION_MODE=api en .env del servidor
 * [ ] pm2 restart costeos
 * [ ] Validar 24h en producción
 * [ ] Opcional: remover dependencia de mssql del package.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ErpRepository,
  ErpItem,
  ErpRecetaItem,
  ErpCliente,
  ErpEmpresa,
  ErpDepartamento,
  ErpMunicipio,
  ContratoAprobadoPayload,
  ErpPushResult,
  ItemFiltros,
  ClienteFiltros,
} from './types'

export class ApiRestErpRepository implements ErpRepository {
  private readonly baseUrl = process.env.ERP_API_URL!
  private readonly apiKey  = process.env.ERP_API_KEY!

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key':    this.apiKey,
    }
  }

  // ── Catálogo de items ──────────────────────────────────────────────────────

  async getItems(filtros?: ItemFiltros): Promise<ErpItem[]> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] getItems: NOT IMPLEMENTED. Usar ERP_INTEGRATION_MODE=sqlserver')

    // Implementación futura:
    // const url = new URL(`${this.baseUrl}/api/costeos/items`)
    // if (filtros?.busqueda)    url.searchParams.set('q',           filtros.busqueda)
    // if (filtros?.tipo)        url.searchParams.set('tipo',        filtros.tipo)
    // if (filtros?.categoriaId) url.searchParams.set('categoriaId', String(filtros.categoriaId))
    // if (filtros?.tieneReceta != null) url.searchParams.set('tieneReceta', String(filtros.tieneReceta))
    // const res = await fetch(url.toString(), {
    //   headers: this.headers(),
    //   next: { revalidate: 300 }, // 5 min — el catálogo no cambia a cada rato
    // })
    // if (!res.ok) throw new Error(`ERP API error: ${res.status}`)
    // return res.json()
  }

  async getItemsCostos(ids: number[]): Promise<Record<number, number>> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] getItemsCostos: NOT IMPLEMENTED.')

    // Implementación futura:
    // const res = await fetch(`${this.baseUrl}/api/costeos/items/costos`, {
    //   method:  'POST',
    //   headers: this.headers(),
    //   body:    JSON.stringify({ ids }),
    //   cache:   'no-store', // costos siempre en tiempo real
    // })
    // if (!res.ok) throw new Error(`ERP API error: ${res.status}`)
    // return res.json() // { [id]: costoUnitario }
  }

  async getListaPrecios(ids: number[]): Promise<Record<number, number | null>> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] getListaPrecios: NOT IMPLEMENTED.')

    // Implementación futura:
    // const res = await fetch(`${this.baseUrl}/api/costeos/items/precios`, {
    //   method:  'POST',
    //   headers: this.headers(),
    //   body:    JSON.stringify({ ids }),
    //   next:    { revalidate: 300 },
    // })
    // if (!res.ok) throw new Error(`ERP API error: ${res.status}`)
    // return res.json() // { [id]: precioVenta | null }
  }

  // ── Recetas ────────────────────────────────────────────────────────────────

  async getRecetaItem(itemId: number): Promise<ErpRecetaItem[]> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] getRecetaItem: NOT IMPLEMENTED.')

    // Implementación futura:
    // const res = await fetch(`${this.baseUrl}/api/costeos/items/${itemId}/receta`, {
    //   headers: this.headers(),
    //   next:    { revalidate: 300 },
    // })
    // if (!res.ok) throw new Error(`ERP API error: ${res.status}`)
    // return res.json()
  }

  // ── Clientes y Catálogos de Costeos ──────────────────────────────────────────

  async validarUsuario(usuarioId: string): Promise<{ userId: string } | null> {
    throw new Error('[ApiRestErpRepository] validarUsuario: NOT IMPLEMENTED.')
  }

  async getEmpresas(usuarioId: string): Promise<ErpEmpresa[]> {
    throw new Error('[ApiRestErpRepository] getEmpresas: NOT IMPLEMENTED.')
  }

  async getClientes(empresaId: number, busqueda: string): Promise<ErpCliente[]> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] getClientes: NOT IMPLEMENTED.')

    // Implementación futura:
    // const url = new URL(`${this.baseUrl}/api/costeos/clientes`)
    // url.searchParams.set('empresaId', String(empresaId))
    // if (busqueda) url.searchParams.set('q', busqueda)
    // const res = await fetch(url.toString(), {
    //   headers: this.headers(),
    //   next:    { revalidate: 60 },
    // })
    // if (!res.ok) throw new Error(`ERP API error: ${res.status}`)
    // return res.json()
  }

  async getDepartamentos(pais?: string): Promise<ErpDepartamento[]> {
    throw new Error('[ApiRestErpRepository] getDepartamentos: NOT IMPLEMENTED.')
  }

  async getMunicipios(deptoId: number, pais?: string): Promise<ErpMunicipio[]> {
    throw new Error('[ApiRestErpRepository] getMunicipios: NOT IMPLEMENTED.')
  }

  async validarVendedor(usuarioErp: string): Promise<string | null> {
    throw new Error('[ApiRestErpRepository] validarVendedor: NOT IMPLEMENTED.')
  }

  // ── Push al ERP ────────────────────────────────────────────────────────────

  async pushContratoAprobado(payload: ContratoAprobadoPayload): Promise<ErpPushResult> {
    // TODO — implementar cuando el ERP tenga el endpoint
    throw new Error('[ApiRestErpRepository] pushContratoAprobado: NOT IMPLEMENTED.')

    // Implementación futura:
    // const res = await fetch(`${this.baseUrl}/api/costeos/contratos-aprobados`, {
    //   method:  'POST',
    //   headers: this.headers(),
    //   body:    JSON.stringify(payload),
    //   cache:   'no-store',
    // })
    // if (!res.ok) {
    //   const err = await res.text()
    //   return { ok: false, error: `ERP API error ${res.status}: ${err}` }
    // }
    // return res.json() // { ok: true, erpContratoId, erpClienteId? }
  }
}
