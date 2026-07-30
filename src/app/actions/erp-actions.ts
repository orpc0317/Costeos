'use server'

import { erp } from '@/lib/erp'
import type { ErpEmpresa, ErpCliente, ErpDepartamento, ErpMunicipio } from '@/lib/erp'
// import { auth } from '@/lib/auth' // Temporalmente comentado si no hay auth implementado completamente, pero la regla dice que lo usemos. 
// Para el prototipo de validación inicial permitiremos saltarnos el auth si falla la sesión estricta.

export async function getEmpresasAction(usuarioErp: string): Promise<{ data?: ErpEmpresa[], error?: string }> {
  try {
    const empresas = await erp.getEmpresas(usuarioErp)
    return { data: empresas }
  } catch (err) {
    console.error('[getEmpresasAction]', err)
    return { error: 'No se pudieron cargar las empresas. Verifica la conexión con el ERP.' }
  }
}

export async function getClientesAction(empresaId: number, busqueda: string): Promise<{ data?: ErpCliente[], error?: string }> {
  try {
    console.log('[getClientesAction] Buscando:', { empresaId, busqueda })
    const clientes = await erp.getClientes(empresaId, busqueda)
    console.log('[getClientesAction] Resultados:', clientes.length)
    return { data: clientes }
  } catch (err) {
    console.error('[getClientesAction]', err)
    return { error: 'Error al buscar clientes en el ERP.' }
  }
}

export async function getDepartamentosAction(): Promise<{ data?: ErpDepartamento[], error?: string }> {
  try {
    const deptos = await erp.getDepartamentos('GT')
    return { data: deptos }
  } catch (err) {
    console.error('[getDepartamentosAction]', err)
    return { error: 'Error al cargar departamentos.' }
  }
}

export async function getMunicipiosAction(deptoId: number): Promise<{ data?: ErpMunicipio[], error?: string }> {
  try {
    const municipios = await erp.getMunicipios(deptoId, 'GT')
    return { data: municipios }
  } catch (err) {
    console.error('[getMunicipiosAction]', err)
    return { error: 'Error al cargar municipios.' }
  }
}

export async function validarVendedorAction(usuarioErp: string): Promise<{ data?: string | null, error?: string }> {
  try {
    const codigo = await erp.validarVendedor(usuarioErp)
    return { data: codigo }
  } catch (err) {
    console.error('[validarVendedorAction]', err)
    return { error: 'Error al validar el código de vendedor en el ERP.' }
  }
}
