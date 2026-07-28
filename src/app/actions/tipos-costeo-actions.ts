'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getTiposCosteoAction() {
  try {
    const tipos = await prisma.tipoCosteo.findMany({
      orderBy: { creadoEn: 'desc' }
    })
    return { data: tipos }
  } catch (error: any) {
    console.error('Error obteniendo tipos de costeo:', error)
    return { error: 'No se pudieron cargar los tipos de costeo' }
  }
}

export async function getTiposCosteoActivosAction() {
  try {
    const tipos = await prisma.tipoCosteo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })
    return { data: tipos }
  } catch (error: any) {
    console.error('Error obteniendo tipos de costeo activos:', error)
    return { error: 'No se pudieron cargar los tipos de costeo' }
  }
}

export async function createTipoCosteoAction(data: {
  codigo: string
  nombre: string
  nivel1Activo: boolean
  nivel1Etiqueta?: string
  nivel1ConDireccion: boolean
  nivel2Activo: boolean
  nivel2Etiqueta?: string
  recursosEtiqueta: string
  activo: boolean
}) {
  try {
    const tipo = await prisma.tipoCosteo.create({
      data
    })
    revalidatePath('/dashboard/configuracion/tipos-costeo')
    return { data: tipo }
  } catch (error: any) {
    console.error('Error creando tipo costeo:', error)
    if (error.code === 'P2002') {
      return { error: 'El código ya existe' }
    }
    return { error: 'No se pudo crear el tipo de costeo' }
  }
}

export async function updateTipoCosteoAction(id: number, data: {
  codigo: string
  nombre: string
  nivel1Activo: boolean
  nivel1Etiqueta?: string
  nivel1ConDireccion: boolean
  nivel2Activo: boolean
  nivel2Etiqueta?: string
  recursosEtiqueta: string
  activo: boolean
}) {
  try {
    const tipo = await prisma.tipoCosteo.update({
      where: { id },
      data
    })
    revalidatePath('/dashboard/configuracion/tipos-costeo')
    return { data: tipo }
  } catch (error: any) {
    console.error('Error actualizando tipo costeo:', error)
    if (error.code === 'P2002') {
      return { error: 'El código ya existe' }
    }
    return { error: 'No se pudo actualizar el tipo de costeo' }
  }
}

export async function deleteTipoCosteoAction(id: number) {
  try {
    // Verificar si hay costeos usándolo
    const count = await prisma.costeo.count({
      where: { tipoCosteoId: id }
    })
    if (count > 0) {
      return { error: 'No se puede eliminar porque hay costeos que utilizan este tipo' }
    }
    
    await prisma.tipoCosteo.delete({
      where: { id }
    })
    revalidatePath('/dashboard/configuracion/tipos-costeo')
    return { data: true }
  } catch (error: any) {
    console.error('Error eliminando tipo costeo:', error)
    return { error: 'No se pudo eliminar el tipo de costeo' }
  }
}
