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
export async function getCatalogoItems(empresaId: number, busqueda?: string, categoriaId?: number) {
  console.log('>>> Server Action getCatalogoItems llamado con empresaId:', empresaId);
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  try {
    const items = await erp.getItems({ empresaId, busqueda, categoriaId })
    console.log(`>>> getCatalogoItems retornó ${items.length} items`);
    return items
  } catch (err) {
    console.error('>>> Error en getCatalogoItems:', err);
    return [];
  }
}

/**
 * Obtiene los componentes (receta) de un item del ERP.
 */
export async function getRecetaDeItem(itemId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  const receta = await erp.getRecetaItem(itemId)
  return receta
}
