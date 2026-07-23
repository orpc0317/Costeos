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
