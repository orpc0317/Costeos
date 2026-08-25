'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { clienteSchema, type ClienteInput, type ClienteRow } from '@/lib/types/clientes'
import { ClienteService } from '@/lib/services/cliente.service'
import { ClienteRepository } from '@/lib/repositories/cliente.repository'
import { detectarSimilares, similitud, removeStopwords } from '@/lib/utils/similarity'
import { stripDesignacionSocietaria } from '@/lib/utils/text'
import { erp } from '@/lib/erp'
import type { ActionResult } from '@/lib/types/common'
import type { ErpCliente } from '@/lib/erp'

const PATH = '/dashboard/configuracion/clientes'

export async function listarClientes(): Promise<ClienteRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ClienteService.listar()
}

export async function crearCliente(data: ClienteInput): Promise<ActionResult<ClienteRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = clienteSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ClienteService.crear(parsed.data, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function actualizarCliente(
  id: number,
  data: ClienteInput & { registroVersion: number },
): Promise<ActionResult<ClienteRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = clienteSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ClienteService.actualizar(id, { ...parsed.data, registroVersion: data.registroVersion }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

// ─── Tipos para búsqueda de similares ─────────────────────────────────────────

export type ClienteSimilarOrigen = 'costeos' | 'erp' | 'both'

export type ClienteSimilarConOrigen = {
  id: number                    // -1 si solo ERP
  razonSocial: string
  nit: string
  codigoErp?: string | null     // solo Costeos (VARCHAR en BD)
  pct: number                   // 100 = exacto, <100 = fuzzy (solo para nombre)
  source: ClienteSimilarOrigen
  erpData?: ErpCliente          // datos del ERP para auto-populate
}

/**
 * Búsqueda de clientes similares en Costeos y ERP.
 *
 * FLUJO:
 *   1. Buscar siempre en Costeos (MySQL).
 *   2. Si Costeos devuelve resultados → retornar sin ir al ERP.
 *      - Con codigoErp: ya sincronizado con ERP.
 *      - Sin codigoErp: existirá en ERP cuando se cree el primer Costeo.
 *   3. Si Costeos no devuelve nada → buscar en ERP (SQL Server).
 *
 * tipo='nombre' → fuzzy match ≥85% sobre razonSocial (4 pasadas de similitud)
 * tipo='nit'    → coincidencia exacta (100%) sobre nit
 */
export async function buscarClientesSimilares(
  busqueda: string,
  tipo: 'nombre' | 'nit',
  empresaId: number,
  excluirId?: number,
): Promise<ClienteSimilarConOrigen[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const todos = await ClienteRepository.findAll()
  const resultado: ClienteSimilarConOrigen[] = []

  // ── 1. Búsqueda en Costeos (MySQL) ──────────────────────────────────────────
  if (tipo === 'nit') {
    // Normalizar guiones para que "1234567-8" y "12345678" sean equivalentes
    const busquedaNorm = busqueda.replace(/-/g, '').toUpperCase()
    const coincidencias = todos.filter(
      c => c.nit.replace(/-/g, '').toUpperCase() === busquedaNorm && c.id !== (excluirId ?? -1)
    )
    for (const c of coincidencias) {
      resultado.push({
        id:          c.id,
        razonSocial: c.razonSocial,
        nit:         c.nit,
        codigoErp:   c.codigoErp,
        pct:         100,
        source:      'costeos',
      })
    }
  } else {
    // Fuzzy match por nombre — usa similitud() con las 4 pasadas:
    // texto completo, sin stopwords, sin designación societaria, combinado.
    const paraComparar = todos
      .filter(c => c.id !== (excluirId ?? -1))
      .map(c => ({ id: c.id, descripcion: c.razonSocial }))

    const similares = detectarSimilares(busqueda, paraComparar, 0.85)
    for (const s of similares) {
      const original = todos.find(c => c.id === s.id)!
      resultado.push({
        id:          s.id,
        razonSocial: original.razonSocial,
        nit:         original.nit,
        codigoErp:   original.codigoErp,
        pct:         s.pct,
        source:      'costeos',
      })
    }
  }

  // ── 2. Si Costeos encontró algo → no ir al ERP ──────────────────────────────
  // Si tiene codigoErp → ya está sincronizado.
  // Si no tiene codigoErp → se sincronizará al crear el primer Costeo.
  // En ambos casos el registro ya está gestionado desde Costeos.
  if (resultado.length > 0) {
    return resultado.sort((a, b) => b.pct - a.pct).slice(0, 8)
  }

  // ── 3. Costeos vacío → buscar en ERP (SQL Server) ───────────────────────────
  // El SP recibe la primera palabra significativa para nombre, o el NIT normalizado
  // para búsqueda exacta. El SP ya maneja la normalización de guiones internamente.
  try {
    let erpClientes: Awaited<ReturnType<typeof erp.getClientes>>

    if (tipo === 'nit') {
      // Pasar el NIT sin guión — el SP ahora hace REPLACE(a.nit,'-','') en ambos lados
      const nitNoDash = busqueda.replace(/-/g, '')
      erpClientes = await erp.getClientes(empresaId, nitNoDash)
    } else {
      const textoCleaned = removeStopwords(stripDesignacionSocietaria(busqueda))
      const busquedaERP  = textoCleaned.split(/\s+/)[0] || busqueda
      erpClientes = await erp.getClientes(empresaId, busquedaERP)
    }

    for (const ec of erpClientes) {
      // Para NIT: comparar sin guiones en ambos lados (defensa adicional)
      if (tipo === 'nit') {
        const nitErpNorm      = (ec.nit ?? '').replace(/-/g, '').toUpperCase()
        const nitBusquedaNorm = busqueda.replace(/-/g, '').toUpperCase()
        if (nitErpNorm !== nitBusquedaNorm) continue
      }

      const pct = tipo === 'nit'
        ? 100
        : Math.round(similitud(busqueda, ec.razonSocial) * 100)

      if (pct < 85 && tipo === 'nombre') continue

      resultado.push({
        id:          -1,
        razonSocial: ec.razonSocial,
        nit:         ec.nit,
        pct,
        source:      'erp',
        erpData:     ec,
      })
    }
  } catch {
    // Si el ERP no responde, continuar solo con lo encontrado en Costeos (vacío)
  }

  return resultado.sort((a, b) => b.pct - a.pct).slice(0, 8)
}
