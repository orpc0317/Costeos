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

export interface DireccionOperativa {
  empresa: number;
  cliente: number;
  secuencia: number;
  nombre: string;
  direccion: string;
  pais: string;
  departamento: string;
  municipio: string;
  departamentoNombre?: string;
  municipioNombre?: string;
}

export async function getClienteDireccionesOperativas(empresaId: number, clienteId: number): Promise<DireccionOperativa[]> {
  try {
    const pool = await getErpDbConnection();
    const request = pool.request();
    
    request.input('PrmEmpresa', empresaId);
    request.input('PrmCliente', clienteId);
    
    const result = await request.execute('sp_buscar_cliente_direccion');
    
    return result.recordset.map(row => ({
      empresa: row.empresa || row.Empresa,
      cliente: row.cliente || row.Cliente,
      secuencia: row.secuencia || row.Secuencia,
      nombre: row.nombre || row.Nombre,
      direccion: row.direccion_nombre || row.direccion || row.Direccion,
      pais: row.pais || row.Pais,
      departamento: String(row.departamento || row.Departamento),
      municipio: String(row.municipio || row.Municipio),
      departamentoNombre: row.departamento_nombre || '',
      municipioNombre: row.municipio_nombre || ''
    }));
  } catch (error) {
    console.error('Error fetching cliente direcciones operativas:', error);
    return [];
  }
}
