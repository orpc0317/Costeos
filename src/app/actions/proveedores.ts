'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { proveedorSchema, type ProveedorInput, type ProveedorRow } from '@/lib/types/proveedores'
import { ProveedorService } from '@/lib/services/proveedor.service'
import { ProveedorRepository } from '@/lib/repositories/proveedor.repository'
import { detectarSimilares, similitud } from '@/lib/utils/similarity'
import { prisma } from '@/lib/prisma'
import { erp } from '@/lib/erp'
import type { ActionResult } from '@/lib/types/common'
import type { ErpProveedor } from '@/lib/erp'

const PATH = '/dashboard/configuracion/proveedores'

export async function listarProveedores(): Promise<ProveedorRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ProveedorService.listar()
}

export async function crearProveedor(data: ProveedorInput): Promise<ActionResult<ProveedorRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = proveedorSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ProveedorService.crear(parsed.data, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function actualizarProveedor(
  id: number,
  data: ProveedorInput & { registroVersion: number },
): Promise<ActionResult<ProveedorRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = proveedorSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ProveedorService.actualizar(id, { ...parsed.data, registroVersion: data.registroVersion }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

// ─── Tipos para búsqueda de similares ─────────────────────────────────────────

export type ProveedorSimilarOrigen = 'costeos' | 'erp' | 'both'

export type ProveedorSimilarConOrigen = {
  id:        number              // -1 si solo ERP
  nombre:    string
  nit:       string
  codigoErp?: string | null     // solo Costeos
  pct:       number              // 100 = exacto, <100 = fuzzy (solo para nombre)
  source:    ProveedorSimilarOrigen
  erpData?:  ErpProveedor        // datos del ERP para auto-populate
}

/**
 * Búsqueda de proveedores similares en Costeos y ERP.
 *
 * FLUJO:
 *   1. Buscar siempre en Costeos (MySQL).
 *   2. Si Costeos devuelve resultados → retornar sin ir al ERP.
 *   3. Si Costeos no devuelve nada → buscar en ERP (SQL Server).
 *
 * tipo='nombre' → fuzzy match ≥85% sobre nombre
 * tipo='nit'    → coincidencia exacta (100%) sobre nit
 */
export async function buscarProveedoresSimilares(
  busqueda:  string,
  tipo:      'nombre' | 'nit',
  empresaId: number,
  excluirId?: number,
): Promise<ProveedorSimilarConOrigen[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []

  const todos = await ProveedorRepository.findAll()
  const resultado: ProveedorSimilarConOrigen[] = []

  // ── 1. Búsqueda en Costeos (MySQL) ──────────────────────────────────────────
  if (tipo === 'nit') {
    const busquedaNorm = busqueda.replace(/-/g, '').toUpperCase()
    const coincidencias = todos.filter(
      p => p.nit.replace(/-/g, '').toUpperCase() === busquedaNorm && p.id !== (excluirId ?? -1)
    )
    for (const p of coincidencias) {
      resultado.push({
        id:        p.id,
        nombre:    p.nombre,
        nit:       p.nit,
        codigoErp: p.codigoErp,
        pct:       100,
        source:    'costeos',
      })
    }
  } else {
    // Fuzzy match por nombre
    const paraComparar = todos
      .filter(p => p.id !== (excluirId ?? -1))
      .map(p => ({ id: p.id, descripcion: p.nombre }))

    const similares = detectarSimilares(busqueda, paraComparar, 0.85)
    for (const s of similares) {
      const original = todos.find(p => p.id === s.id)!
      resultado.push({
        id:        s.id,
        nombre:    original.nombre,
        nit:       original.nit,
        codigoErp: original.codigoErp,
        pct:       s.pct,
        source:    'costeos',
      })
    }
  }

  // ── 2. Si Costeos encontró algo → no ir al ERP ──────────────────────────────
  if (resultado.length > 0) {
    return resultado.sort((a, b) => b.pct - a.pct).slice(0, 8)
  }

  // ── 3. Costeos vacío → buscar en ERP (SQL Server) ───────────────────────────
  // IMPORTANTE: el SP espera el codigoErp de la empresa, no el id interno de BD.
  // Se resuelve igual que resolveCodigoErpEmpresa() en erp.ts.
  try {
    const empresa = await prisma.empresa.findUnique({
      where:  { id: empresaId },
      select: { codigoErp: true, nombre: true },
    })
    const codigoErpEmpresa = empresa?.codigoErp
    if (!codigoErpEmpresa) {
      // Empresa sin código ERP configurado → no puede consultar el SP
      return resultado.sort((a, b) => b.pct - a.pct).slice(0, 8)
    }

    let erpProveedores: Awaited<ReturnType<typeof erp.getProveedores>>

    if (tipo === 'nit') {
      const nitNoDash = busqueda.replace(/-/g, '')
      erpProveedores = await erp.getProveedores(codigoErpEmpresa as unknown as number, nitNoDash)
    } else {
      // Usar la primera palabra significativa como texto de búsqueda para el SP
      const palabraClave = busqueda.split(/\s+/)[0] || busqueda
      erpProveedores = await erp.getProveedores(codigoErpEmpresa as unknown as number, palabraClave)
    }

    for (const ep of erpProveedores) {
      if (tipo === 'nit') {
        // Para NIT: comparar sin guiones
        const nitErpNorm      = (ep.nit ?? '').replace(/-/g, '').toUpperCase()
        const nitBusquedaNorm = busqueda.replace(/-/g, '').toUpperCase()
        if (nitErpNorm !== nitBusquedaNorm) continue
      }

      // El SP ya filtró por relevancia. NO aplicamos umbral de similitud:
      // similitud("OFICINA", "DISTRIBUIDORA OFICINA SA") ≈ 50% → se perdería.
      // El pct se calcula solo para ordenar y mostrar visualmente.
      const pct = tipo === 'nit'
        ? 100
        : Math.max(50, Math.round(similitud(busqueda, ep.nombre) * 100))

      resultado.push({
        id:      -1,
        nombre:  ep.nombre,
        nit:     ep.nit,
        pct,
        source:  'erp',
        erpData: ep,
      })
    }
  } catch {
    // Si el ERP no responde, continuar solo con lo encontrado en Costeos (vacío)
  }

  return resultado.sort((a, b) => b.pct - a.pct).slice(0, 8)
}
