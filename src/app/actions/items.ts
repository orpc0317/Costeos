'use server'

import { revalidatePath } from 'next/cache'
import { requireManagerOrAdmin } from '@/lib/auth-helpers'
import { itemSchema, type ItemInput, type ItemRow } from '@/lib/types/items'
import { ItemService } from '@/lib/services/item.service'
import type { ActionResult } from '@/lib/types/common'

const PATH = '/dashboard/configuracion/items'

export async function listarItems(): Promise<ItemRow[]> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return []
  return ItemService.listar()
}

export async function crearItem(data: ItemInput): Promise<ActionResult<ItemRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ItemService.crear(parsed.data, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}

export async function actualizarItem(
  id: number,
  data: ItemInput & { registroVersion: number },
): Promise<ActionResult<ItemRow>> {
  const guard = await requireManagerOrAdmin()
  if (!guard.ok) return guard

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0]?.toString() }
  }

  const result = await ItemService.actualizar(id, { ...parsed.data, registroVersion: data.registroVersion }, guard.userId)
  if (result.ok) revalidatePath(PATH)
  return result
}
