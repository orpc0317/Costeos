'use server'

import { erp } from '@/lib/erp'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Obtiene las empresas disponibles para el usuario logueado usando su código ERP.
 */
export async function getEmpresasForUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('No autorizado')
  }

  // Obtenemos el usuarioErp desde la DB
  const usuario = await prisma.usuario.findUnique({
    where: { id: parseInt(session.user.id, 10) },
    select: { usuarioErp: true }
  })

  if (!usuario || !usuario.usuarioErp) {
    throw new Error('El usuario no tiene un código ERP asociado')
  }

  // Consultar el repositorio ERP
  const empresas = await erp.getEmpresas(usuario.usuarioErp)
  return empresas
}

/**
 * Busca clientes en el ERP bajo una empresa específica.
 */
export async function searchClientes(empresaId: number, busqueda: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('No autorizado')
  }

  if (busqueda.trim().length < 2) {
    return [] // Optimización: no buscar si es muy corto
  }

  const clientes = await erp.getClientes(empresaId, busqueda)
  return clientes
}

/**
 * Obtiene el catálogo de items del ERP.
 */
export async function getCatalogoItems(busqueda?: string, categoriaId?: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  const items = await erp.getItems({ busqueda, categoriaId })
  return items
}

/**
 * Obtiene los componentes (receta) de un item del ERP.
 */
export async function getRecetaDeItem(itemId: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  const receta = await erp.getRecetaItem(itemId)
  return receta
}
