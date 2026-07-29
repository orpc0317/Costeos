'use server'

import { prisma } from '@/lib/prisma'

export interface CambioCampo {
  campo: string
  anterior: string | null
  nuevo: string
}

export interface HistorialEntry {
  id: string
  fecha: string
  usuario: string
  accion: string
  detalle?: string
  cambios?: CambioCampo[]
}

// Diccionario opcional para traducir nombres de base de datos a nombres amigables
const MAPA_CAMPOS: Record<string, string> = {
  nombre: 'Nombre',
  email: 'Correo',
  rol: 'Rol',
  usuarioErp: 'Usuario ERP',
  activo: 'Estado',
  baseEvaluacion: 'Base de Evaluación',
}

function formatValor(valor: any, campo: string): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'boolean') {
    if (campo === 'activo' || campo === 'Estado') {
      return valor ? 'Activo' : 'Inactivo'
    }
    return valor ? 'Sí' : 'No'
  }
  if (campo === 'rol' || campo === 'Rol') {
    const rolMap: Record<string, string> = {
      'ADMIN': 'Administrador',
      'MANAGER': 'Gerente',
      'ANALISTA': 'Analista',
      'VIEWER': 'Lector'
    }
    if (typeof valor === 'string' && rolMap[valor.toUpperCase()]) {
      return rolMap[valor.toUpperCase()]
    }
  }
  return String(valor)
}

export async function obtenerHistorial(tabla: string, registroId: number): Promise<HistorialEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      tabla,
      registroId,
    },
    include: {
      usuario: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      en: 'desc',
    },
  })

  return logs.map(log => {
    let cambios: CambioCampo[] | undefined = undefined

    if (log.accion === 'UPDATE' && log.datosAntes && log.datosDespues) {
      try {
        const antes = JSON.parse(log.datosAntes)
        const despues = JSON.parse(log.datosDespues)
        
        cambios = []
        for (const key of Object.keys(despues)) {
          // Si el valor cambió
          if (JSON.stringify(antes[key]) !== JSON.stringify(despues[key])) {
            const nombreAmigable = MAPA_CAMPOS[key] || key
            cambios.push({
              campo: nombreAmigable,
              anterior: formatValor(antes[key], key),
              nuevo: formatValor(despues[key], key)
            })
          }
        }
      } catch (e) {
        console.error("Error parseando JSON de auditoría", e)
      }
    } else if (log.accion === 'CREATE' && log.datosDespues) {
      try {
        const despues = JSON.parse(log.datosDespues)
        cambios = []
        for (const key of Object.keys(despues)) {
          if (despues[key] !== null && despues[key] !== undefined && despues[key] !== '') {
            const nombreAmigable = MAPA_CAMPOS[key] || key
            cambios.push({
              campo: nombreAmigable,
              anterior: null,
              nuevo: formatValor(despues[key], key)
            })
          }
        }
      } catch(e) {
         console.error("Error parseando JSON de auditoría", e)
      }
    }

    // Traducir acción
    let accionAmigable = log.accion
    if (log.accion === 'CREATE') accionAmigable = 'CREACION'
    if (log.accion === 'UPDATE') {
      // Si solo cambió el activo, llamarlo CAMBIO ESTADO
      if (cambios && cambios.length === 1 && cambios[0].campo === 'Estado') {
        accionAmigable = 'CAMBIO ESTADO'
      } else {
        accionAmigable = 'EDICION'
      }
    }
    if (log.accion === 'DELETE') accionAmigable = 'ELIMINACION'

    return {
      id: String(log.id),
      fecha: log.en.toISOString(),
      usuario: log.usuario.nombre,
      accion: accionAmigable,
      cambios: cambios && cambios.length > 0 ? cambios : undefined
    }
  })
}
