'use server'

import { getErpDbConnection } from '@/lib/erp-db'

export interface TurnoItem {
  codigo: number;
  descripcion: string;
  personas: number;
  lunes: number;
  lunes_horas: number;
  martes: number;
  martes_horas: number;
  miercoles: number;
  miercoles_horas: number;
  jueves: number;
  jueves_horas: number;
  viernes: number;
  viernes_horas: number;
  sabado: number;
  sabado_horas: number;
  domingo: number;
  domingo_horas: number;
}

export interface UniformeItem {
  codigo: string;
  descripcion: string;
}

export async function getTurnos(empresaId: number): Promise<TurnoItem[]> {
  try {
    const pool = await getErpDbConnection()
    const request = pool.request()
    
    request.input('PrmEmpresa', empresaId)
    const result = await request.execute('sp_buscar_turnos')
    
    return result.recordset.map(row => ({
      codigo: row.codigo,
      descripcion: row.descripcion,
      personas: row.personas || 0,
      lunes: row.lunes || 0,
      lunes_horas: row.lunes_horas || 0,
      martes: row.martes || 0,
      martes_horas: row.martes_horas || 0,
      miercoles: row.miercoles || 0,
      miercoles_horas: row.miercoles_horas || 0,
      jueves: row.jueves || 0,
      jueves_horas: row.jueves_horas || 0,
      viernes: row.viernes || 0,
      viernes_horas: row.viernes_horas || 0,
      sabado: row.sabado || 0,
      sabado_horas: row.sabado_horas || 0,
      domingo: row.domingo || 0,
      domingo_horas: row.domingo_horas || 0,
    }))
  } catch (error) {
    console.error('Error fetching turnos:', error)
    return []
  }
}

export async function getUniformes(empresaId: number): Promise<UniformeItem[]> {
  try {
    const pool = await getErpDbConnection()
    const request = pool.request()
    
    request.input('PrmEmpresa', empresaId)
    const result = await request.execute('sp_buscar_uniformes')
    
    return result.recordset.map(row => ({
      codigo: String(row.codigo),
      descripcion: row.descripcion || ''
    }))
  } catch (error) {
    console.error('Error fetching uniformes:', error)
    return []
  }
}

export interface ServicioVentaItem {
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  tipo_bien: number;
  tipo_item: number;
  item_registro: number;
  recurrente: number;
  requiere_direccion: number;
  precio_venta_cero: number;
  perfil: number;
  manejo_costos: number;
}

export async function getServiciosVenta(empresaId: number, searchText: string = ''): Promise<ServicioVentaItem[]> {
  try {
    const pool = await getErpDbConnection();
    const request = pool.request();
    
    request.input('PrmEmpresa', empresaId);
    request.input('PrmSearchText', searchText);
    const result = await request.execute('sp_buscar_servicios_venta');
    
    return result.recordset.map(row => ({
      codigo: String(row.codigo),
      descripcion: row.descripcion || '',
      unidad_medida: row.unidad_medida || '',
      tipo_bien: row.tipo_bien || 0,
      tipo_item: row.tipo_item || 0,
      item_registro: row.item_registro || 0,
      recurrente: row.recurrente || 0,
      requiere_direccion: row.requiere_direccion || 0,
      precio_venta_cero: row.precio_venta_cero || 0,
      perfil: row.perfil || 0,
      manejo_costos: row.manejo_costos || 0,
    }));
  } catch (error) {
    console.error('Error fetching servicios venta:', error);
    return [];
  }
}

