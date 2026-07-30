'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProyectoCosteo } from '@/lib/types/costeos'

export interface HistorialEntry {
  id: number
  creadoEn: Date
  usuarioNombre: string
}

export async function getHistorialAutoGuardado(costeoIdStr: string): Promise<{ success: boolean; data?: HistorialEntry[]; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const costeoId = parseInt(costeoIdStr, 10)
    if (isNaN(costeoId)) return { success: false, error: 'ID de costeo inválido' }

    const historiales = await prisma.historialAutoGuardado.findMany({
      where: { costeoId },
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        creadoEn: true,
        usuario: { select: { nombre: true } }
      }
    })

    const data: HistorialEntry[] = historiales.map(h => ({
      id: h.id,
      creadoEn: h.creadoEn,
      usuarioNombre: h.usuario.nombre
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error("Error obteniendo historial:", error)
    return { success: false, error: error.message || 'Error interno' }
  }
}

export async function getSnapshotAutoGuardado(historialId: number): Promise<{ success: boolean; data?: ProyectoCosteo; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const snapshot = await prisma.historialAutoGuardado.findUnique({
      where: { id: historialId },
      select: { datos: true }
    })

    if (!snapshot) return { success: false, error: 'Snapshot no encontrado' }

    const proyecto: ProyectoCosteo = JSON.parse(snapshot.datos)
    return { success: true, data: proyecto }
  } catch (error: any) {
    console.error("Error obteniendo snapshot:", error)
    return { success: false, error: error.message || 'Error interno' }
  }
}
