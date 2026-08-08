/**
 * ERP Repository — El Switch
 *
 * FASE A (ahora):    ERP_INTEGRATION_MODE = "sqlserver" (o no definido)
 *                    → SqlServerErpRepository: queries directas a SQL Server del ERP
 *
 * FASE C (futuro):   ERP_INTEGRATION_MODE = "api"
 *                    → ApiRestErpRepository: fetch() a los endpoints REST del ERP
 *
 * El switch es UNA variable de entorno + pm2 restart.
 * No hay cambios en UI, Server Actions, ni tipos.
 *
 * REGLA: los Server Actions SIEMPRE importan desde aquí:
 *   import { erp } from '@/lib/erp'
 *   const productos = await erp.getProductos()
 *
 * NUNCA importar SqlServerErpRepository ni ApiRestErpRepository directamente.
 */

import { SqlServerErpRepository } from './sql-server'
import { ApiRestErpRepository } from './api-rest'
import type { ErpRepository } from './types'

function createErpRepository(): ErpRepository {
  const mode = process.env.ERP_INTEGRATION_MODE ?? 'sqlserver'

  if (mode === 'api') {
    return new ApiRestErpRepository()
  }

  return new SqlServerErpRepository()
}

export const erp: ErpRepository = createErpRepository()

// Re-exportar tipos para conveniencia
export type {
  ErpRepository,
  ErpItem,
  ErpCliente,
  ErpRecetaItem,
  ErpPushResult,
  ItemFiltros,
  ClienteFiltros,
  ContratoAprobadoPayload,
  ErpEmpresa,
  ErpDepartamento,
  ErpMunicipio,
  ErpTurno,
  ErpUniforme,
  ErpServicioVenta,
  ErpDireccionOperativa,
} from './types'
