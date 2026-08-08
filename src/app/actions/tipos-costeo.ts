'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import {
  crearTipoCosteoSchema,
  editarTipoCosteoSchema,
  type TipoCosteoRow,
} from '@/lib/types/tipos-costeo'
import { TipoCosteoService } from '@/lib/services/tipo-costeo.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/tipos-costeo'

export async function listarTiposCosteo(): Promise<TipoCosteoRow[]> {
  const guard = await requireAdmin()
  if (!guard.ok) return []
  return TipoCosteoService.listar()
}

export async function crearTipoCosteo(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const raw = {
    empresaId:        formData.get('empresaId'),
    nombre:           formData.get('nombre'),
    cantidadNiveles:  formData.get('cantidadNiveles'),
    etiquetasNiveles: formData.get('etiquetasNiveles') || '',
    coloresNiveles:   formData.get('coloresNiveles') || '',
    iconosNiveles:    formData.get('iconosNiveles') || '',
    nivelConDireccion:formData.get('nivelConDireccion'),
    lineaEtiqueta:    formData.get('lineaEtiqueta') || '',
    baseEvaluacion:   formData.get('baseEvaluacion') || 'GLOBAL',
    manejoPlazo:      formData.get('manejoPlazo') || 'NO_APLICA',
    fijarPlazo:       formData.get('fijarPlazo'),
  }

  const parsed = crearTipoCosteoSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  const result = await TipoCosteoService.crear({
    ...parsed.data,
    etiquetasNiveles: parsed.data.etiquetasNiveles ?? '',
    coloresNiveles:   parsed.data.coloresNiveles ?? '',
    iconosNiveles:    parsed.data.iconosNiveles ?? '',
    lineaEtiqueta:    parsed.data.lineaEtiqueta ?? '',
  }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function editarTipoCosteo(
  id: number,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<TipoCosteoRow>> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const raw = {
    empresaId:         formData.get('empresaId'),
    codigo:            formData.get('codigo'),
    nombre:            formData.get('nombre'),
    cantidadNiveles:   formData.get('cantidadNiveles'),
    etiquetasNiveles:  formData.get('etiquetasNiveles') || '',
    coloresNiveles:    formData.get('coloresNiveles') || '',
    iconosNiveles:     formData.get('iconosNiveles') || '',
    nivelConDireccion: formData.get('nivelConDireccion'),
    lineaEtiqueta:     formData.get('lineaEtiqueta') || '',
    baseEvaluacion:    formData.get('baseEvaluacion') || 'GLOBAL',
    manejoPlazo:       formData.get('manejoPlazo') || 'NO_APLICA',
    fijarPlazo:        formData.get('fijarPlazo'),
    registroVersion:   formData.get('registroVersion'),
  }

  const parsed = editarTipoCosteoSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }

  const result = await TipoCosteoService.editar(id, {
    ...parsed.data,
    etiquetasNiveles: parsed.data.etiquetasNiveles ?? '',
    coloresNiveles:   parsed.data.coloresNiveles ?? '',
    iconosNiveles:    parsed.data.iconosNiveles ?? '',
    lineaEtiqueta:    parsed.data.lineaEtiqueta ?? '',
  }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function toggleActivo(id: number, registroVersion: number): Promise<ActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  const result = await TipoCosteoService.toggleActivo(id, registroVersion, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function getTiposCosteoActivosAction() {
  const { prisma } = await import('@/lib/prisma')
  const { TipoCosteoRepository } = await import('@/lib/repositories/tipo-costeo.repository')
  return TipoCosteoRepository.findActivos()
}
