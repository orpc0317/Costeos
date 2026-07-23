'use server'

import { getErpDbConnection } from '@/lib/erp-db'

export interface UbicacionItem {
  codigo: string
  nombre: string
}

export async function getDepartamentos(paisCodigo: string): Promise<UbicacionItem[]> {
  try {
    const pool = await getErpDbConnection()
    const request = pool.request()
    
    request.input('PrmPais', paisCodigo)
    // Asumimos que el SP devuelve columnas compatibles, si devuelven otros nombres,
    // los mapeamos abajo. Lo común es que devuelvan 'codigo' y 'nombre' (o id y descripcion)
    const result = await request.execute('sp_departamentos_pais')
    
    return result.recordset.map(row => ({
      codigo: row.codigo || row.Codigo || row.ID || row.id || String(Object.values(row)[0]),
      nombre: row.nombre || row.Nombre || row.Descripcion || row.descripcion || String(Object.values(row)[1])
    }))
  } catch (error) {
    console.error('Error fetching departamentos:', error)
    return []
  }
}

export async function getMunicipios(paisCodigo: string, deptoCodigo: string): Promise<UbicacionItem[]> {
  if (!deptoCodigo) return []
  
  try {
    const pool = await getErpDbConnection()
    const request = pool.request()
    
    request.input('PrmPais', paisCodigo)
    request.input('PrmDepartamento', parseInt(deptoCodigo, 10))
    const result = await request.execute('sp_municipios_departamento')
    
    return result.recordset.map(row => ({
      codigo: row.codigo || row.Codigo || row.ID || row.id || String(Object.values(row)[0]),
      nombre: row.nombre || row.Nombre || row.Descripcion || row.descripcion || String(Object.values(row)[1])
    }))
  } catch (error) {
    console.error('Error fetching municipios:', error)
    return []
  }
}
