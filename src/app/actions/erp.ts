'use server'

import { requireAuth } from '@/lib/auth-helpers'
import { getUsuarioErp } from '@/lib/auth-helpers'
import { erp } from '@/lib/erp'
import { prisma } from '@/lib/prisma'
import type { ErpCliente } from '@/lib/erp'

/**
 * erp.ts — Server Actions para consultas al ERP externo.
 *
 * REGLA: Estas funciones SOLO consultan el ERP (lectura).
 * No modifican datos locales. No necesitan revalidatePath.
 * Todas requieren sesión autenticada.
 */

/**
 * Resuelve el código ERP de una empresa a partir de su ID interno de Costeos.
 * El SP siempre espera el `codigoErp` de la empresa (ej. "1"), NO el ID de BD.
 * Si la empresa no tiene codigoErp configurado, lanza error para evitar
 * consultas silenciosas con parámetro incorrecto.
 */
async function resolveCodigoErpEmpresa(empresaId: number): Promise<string> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { codigoErp: true, nombre: true },
  })
  if (!empresa) throw new Error(`Empresa ${empresaId} no encontrada`)
  if (!empresa.codigoErp) throw new Error(`Empresa "${empresa.nombre}" no tiene código ERP configurado`)
  return empresa.codigoErp
}

export async function getEmpresasForUser() {
  const usuarioErp = await getUsuarioErp()
  if (!usuarioErp?.usuarioErp) {
    throw new Error('El usuario no tiene un código ERP asociado')
  }
  return erp.getEmpresas(usuarioErp.usuarioErp)
}

/**
 * Retorna todas las empresas del sistema (desde Prisma) con su flag
 * de sincronización de clientes con ERP. Usado en el wizard Nuevo Costeo.
 */
export async function getEmpresasConSync(): Promise<{ id: number; nombre: string; syncClientes: boolean }[]> {
  const guard = await requireAuth()
  if (!guard.ok) return []

  const empresas = await prisma.empresa.findMany({
    include: { configuracionesSync: true },
    orderBy: { nombre: 'asc' },
  })

  return empresas.map(e => ({
    id:           e.id,
    nombre:       e.nombre,
    syncClientes: e.configuracionesSync.some(
      s => s.catalogo === 'CLIENTES' && s.sincronizar
    ),
  }))
}

// ─── Tipos para la búsqueda combinada de clientes ─────────────────────────────

export type ClienteWizardResultado = ErpCliente & {
  /** 'LOCAL' = ya existe en Costeos · 'ERP' = solo en el ERP (cliente nuevo para Costeos) */
  fuente: 'LOCAL' | 'ERP'
  /** ID local en costeos_cliente (solo si fuente = 'LOCAL') */
  clienteLocalId?: number
}

/**
 * Búsqueda combinada de clientes para el wizard de Nuevo Costeo.
 *
 * Flujo:
 *  1. Siempre busca en costeos_cliente (BD local) por NIT, razón social o código.
 *  2. Si syncClientes = true → también busca en ERP.
 *     Dedup: se excluyen del resultado ERP los clientes cuyo codigoERP
 *     ya aparezca en los resultados locales (evita duplicados).
 *  3. Combina: primero los locales, luego los exclusivos del ERP.
 *
 * @param empresaId   ID local de la empresa (costeos_empresa.id)
 * @param busqueda    Texto de búsqueda normalizado (sin tildes, mayúsculas)
 * @param syncClientes Si true, también consulta el ERP
 */
export async function searchClientesWizard(
  empresaId: number,
  busqueda: string,
  syncClientes: boolean,
): Promise<ClienteWizardResultado[]> {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')

  const texto = busqueda.trim()
  if (texto.length < 2) return []

  const resultado: ClienteWizardResultado[] = []

  // ── 1. Buscar en Costeos local ────────────────────────────────────────────────
  const locales = await prisma.cliente.findMany({
    where: {
      empresaId,
      OR: [
        { nit:         { contains: texto } },
        { razonSocial: { contains: texto } },
        { codigoTemp:  { contains: texto } },
        { codigoErp:   { contains: texto } },
      ],
    },
    take: 20,
  })

  // Construir set de codigosErp locales para deduplicar con ERP
  const codigosErpLocales = new Set(
    locales.map(c => c.codigoErp).filter(Boolean) as string[]
  )

  for (const c of locales) {
    resultado.push({
      fuente:          'LOCAL',
      clienteLocalId:  c.id,
      id:              c.codigoErp ?? undefined,
      codigo:          c.codigoErp ?? undefined,
      nit:             c.nit,
      razonSocial:     c.razonSocial,
      nombreComercial: c.razonSocial,
      direccion:       c.direccionFiscal ?? undefined,
      diasCredito:     c.diasCredito,
    })
  }

  // ── 2. Si sync ON → también buscar en ERP ────────────────────────────────────
  if (syncClientes) {
    try {
      const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
      const erpClientes = await erp.getClientes(codigoErpEmpresa as unknown as number, texto)

      for (const ec of erpClientes) {
        // Excluir si ya tenemos ese cliente localmente (por codigoErp)
        if (ec.codigo && codigosErpLocales.has(ec.codigo)) continue

        resultado.push({
          ...ec,
          fuente: 'ERP',
        })
      }
    } catch {
      // Si el ERP no responde, continuar solo con locales
    }
  }

  return resultado
}

export async function getCatalogoItems(empresaId: number, busqueda?: string, categoriaId?: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  try {
    const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
    return await erp.getItems({ empresaId: codigoErpEmpresa as unknown as number, busqueda, categoriaId })
  } catch {
    return []
  }
}

export async function getRecetaDeItem(itemId: string) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getRecetaItem(itemId)
}

export async function getDepartamentosERP() {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getDepartamentos('GT')
}

export async function getMunicipiosERP(deptoId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getMunicipios(deptoId, 'GT')
}

export async function getTurnosERP(empresaId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
  return erp.getTurnos(codigoErpEmpresa as unknown as number)
}

export async function getUniformesERP(empresaId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
  return erp.getUniformes(codigoErpEmpresa as unknown as number)
}

export async function getServiciosVentaERP(empresaId: number, searchText: string = '') {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
  return erp.getServiciosVenta(codigoErpEmpresa as unknown as number, searchText)
}

export async function getClienteDireccionesERP(empresaId: number, clienteId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  const codigoErpEmpresa = await resolveCodigoErpEmpresa(empresaId)
  return erp.getClienteDirecciones(codigoErpEmpresa as unknown as number, clienteId)
}

/**
 * Busca una empresa en el ERP por su código (usando sp_buscar_empresa).
 * Retorna { codigo, nombre } o null si no existe o hay error.
 * El nombre devuelto es solo informativo — NUNCA se graba en Costeos.
 */
export async function buscarEmpresaErp(codigoEmpresa: string) {
  const guard = await requireAuth()
  if (!guard.ok) return null
  const codigo = codigoEmpresa.trim()
  if (!codigo) return null
  try {
    return await erp.buscarEmpresa(codigo)
  } catch {
    return null
  }
}
