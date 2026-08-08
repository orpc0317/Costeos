'use server'

import { requireAuth } from '@/lib/auth-helpers'
import { getUsuarioErp } from '@/lib/auth-helpers'
import { erp } from '@/lib/erp'

/**
 * erp.ts — Server Actions para consultas al ERP externo.
 *
 * REGLA: Estas funciones SOLO consultan el ERP (lectura).
 * No modifican datos locales. No necesitan revalidatePath.
 * Todas requieren sesión autenticada.
 */

export async function getEmpresasForUser() {
  const usuarioErp = await getUsuarioErp()
  if (!usuarioErp?.usuarioErp) {
    throw new Error('El usuario no tiene un código ERP asociado')
  }
  return erp.getEmpresas(usuarioErp.usuarioErp)
}

export async function searchClientes(empresaId: number, busqueda: string) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  if (busqueda.trim().length < 2) return []
  return erp.getClientes(empresaId, busqueda)
}

export async function getCatalogoItems(empresaId: number, busqueda?: string, categoriaId?: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  try {
    return await erp.getItems({ empresaId, busqueda, categoriaId })
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
  return erp.getTurnos(empresaId)
}

export async function getUniformesERP(empresaId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getUniformes(empresaId)
}

export async function getServiciosVentaERP(empresaId: number, searchText: string = '') {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getServiciosVenta(empresaId, searchText)
}

export async function getClienteDireccionesERP(empresaId: number, clienteId: number) {
  const guard = await requireAuth()
  if (!guard.ok) throw new Error('No autorizado')
  return erp.getClienteDirecciones(empresaId, clienteId)
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
