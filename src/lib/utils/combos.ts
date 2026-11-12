/**
 * Árbol de combos del catálogo y los recursos que el costeador debe crear.
 *
 * Incluido (nuevoIncluido=1) entra al árbol al agregar el ítem.
 * Requerido (nuevoRequerido=1) no se puede quitar; si falta en un borrador, se reincorpora.
 * Costear solo resuelve ítems que ya están en el árbol.
 */
import type { ComboDisponible, RecursoCosteo } from '@/lib/types/costeos'
import type { ItemRow, DetalleComboRow } from '@/lib/types/items'

/**
 * Fuente de verdad para mapear tipoItem + tipoProducto → categoría del RecursoCosteo.
 *
 * Nueva taxonomía tipo_item (1-6):
 *   1 = Producto          → ARTICULO
 *   2 = Producto Genérico → ARTICULO
 *   3 = Servicio + tipoProducto=1 (Outsourcing) → RECURSO_HUMANO
 *   3 = Servicio + tipoProducto=0 (Estándar)    → SERVICIO
 *   4 = Equipo                                  → EQUIPO
 *   5 = Financiero                              → SERVICIO
 *   6 = Bono                                    → SERVICIO
 */
export function resolveCategoria(
  tipoItem: number | undefined | null,
  tipoProducto: number | undefined | null,
): RecursoCosteo['categoria'] {
  if (tipoItem === 1 || tipoItem === 2) return 'ARTICULO'
  if (tipoItem === 3) return tipoProducto === 1 ? 'RECURSO_HUMANO' : 'SERVICIO'
  if (tipoItem === 4) return 'EQUIPO'
  return 'SERVICIO'
}

export function cantidadIncluida(parentCantidad: number, nuevoCantidad: number): number {
  return Math.max(1, Math.round(parentCantidad * (Number(nuevoCantidad) || 1)))
}

export function fabricaIdCombo(prefijo: string): (itemId: number) => string {
  let n = 0
  const stamp = Date.now()
  return (itemId) => `${prefijo}${stamp}-${itemId}-${n++}`
}

function costoInicial(manejoCostos: number, manual?: number): number {
  if (manejoCostos === 99) return 0
  return manejoCostos === 2 ? (manual ?? 0) : 0
}

function recursoDeCombo(
  item: { id: number; descripcion: string; tipoItem?: number | null; tipoProducto?: number | null },
  id: string,
  parentRecursoId: string,
  cantidad: number,
  costoUnitario: number,
): RecursoCosteo {
  return {
    id,
    itemId: item.id,
    nombre: item.descripcion,
    categoria: resolveCategoria(item.tipoItem, item.tipoProducto),
    tipoCosto: 'MENSUAL',
    cantidad,
    costoUnitario,
    precioVentaUnitario: 0,
    precioVentaOrigen: 'MANUAL',
    esCombo: true,
    comboParentId: parentRecursoId,
    recetas: [],
  }
}

export function buildCombosDisponibles(
  combos: DetalleComboRow[],
  allItems: ItemRow[],
  costosManuales: Record<number, number>,
  path: Set<number> = new Set(),
): ComboDisponible[] {
  return combos
    .map(c => {
      if (path.has(c.productoSecundarioId)) return null
      const secItem = allItems.find(i => i.id === c.productoSecundarioId)
      if (!secItem) return null
      const next = new Set(path)
      next.add(c.productoSecundarioId)
      return {
        comboId:              c.id,
        productoSecundarioId: c.productoSecundarioId,
        nombre:               secItem.descripcion,
        unidadMedida:         secItem.unidadMedida ?? undefined,
        nuevoCantidad:        Number(c.nuevoCantidad),
        nuevoIncluido:        Number(c.nuevoIncluido),
        nuevoRequerido:       Number(c.nuevoRequerido),
        manejoCostos:         secItem.manejoCostos,
        costosManuales:       secItem.manejoCostos === 2 ? (costosManuales[secItem.id] ?? 0) : undefined,
        tipoItem:             secItem.tipoItem,
        tipoProducto:         secItem.tipoProducto,
        hijos:                secItem.combosPrincipal?.length
          ? buildCombosDisponibles(secItem.combosPrincipal, allItems, costosManuales, next)
          : undefined,
      } satisfies ComboDisponible
    })
    .filter(Boolean) as ComboDisponible[]
}

/** Al crear el puesto: mete cada combo con Incluido, y baja por sus hijos incluidos. */
export function expandirCombosIncluidos(args: {
  combos: DetalleComboRow[]
  allItems: ItemRow[]
  costosManuales: Record<number, number>
  parentRecursoId: string
  parentCantidad: number
  idDe: (itemId: number) => string
  visitados?: Set<number>
}): RecursoCosteo[] {
  const visitados = args.visitados ?? new Set<number>()
  const out: RecursoCosteo[] = []
  for (const combo of args.combos) {
    if (!combo.nuevoIncluido || Number(combo.nuevoCantidad) <= 0) continue
    if (visitados.has(combo.productoSecundarioId)) continue
    const sec = args.allItems.find(i => i.id === combo.productoSecundarioId)
    if (!sec) continue
    const cantidad = cantidadIncluida(args.parentCantidad, Number(combo.nuevoCantidad))
    const id = args.idDe(sec.id)
    out.push(recursoDeCombo(
      sec,
      id,
      args.parentRecursoId,
      cantidad,
      costoInicial(sec.manejoCostos, args.costosManuales[sec.id]),
    ))
    const next = new Set(visitados)
    next.add(sec.id)
    if (sec.combosPrincipal?.length) {
      out.push(...expandirCombosIncluidos({
        ...args,
        combos: sec.combosPrincipal,
        parentRecursoId: id,
        parentCantidad: cantidad,
        visitados: next,
      }))
    }
  }
  return out
}

/** Al marcar Incluido en la pestaña Combo: baja por los hijos que el catálogo trae incluidos. */
export function expandirHijosDisponibles(
  hijos: ComboDisponible[] | undefined,
  parentRecursoId: string,
  parentCantidad: number,
  idDe: (itemId: number) => string,
  path: Set<number> = new Set(),
): RecursoCosteo[] {
  if (!hijos?.length) return []
  const out: RecursoCosteo[] = []
  for (const hijo of hijos) {
    if (!hijo.nuevoIncluido || Number(hijo.nuevoCantidad) <= 0) continue
    if (path.has(hijo.productoSecundarioId)) continue
    const cantidad = cantidadIncluida(parentCantidad, hijo.nuevoCantidad)
    const id = idDe(hijo.productoSecundarioId)
    out.push(recursoDeCombo(
      {
        id: hijo.productoSecundarioId,
        descripcion: hijo.nombre,
        tipoItem: hijo.tipoItem,
        tipoProducto: hijo.tipoProducto,
      },
      id,
      parentRecursoId,
      cantidad,
      costoInicial(hijo.manejoCostos, hijo.costosManuales),
    ))
    const next = new Set(path)
    next.add(hijo.productoSecundarioId)
    out.push(...expandirHijosDisponibles(hijo.hijos, id, cantidad, idDe, next))
  }
  return out
}

/**
 * En un borrador ya guardado, vuelve a meter los combos Requeridos que no están
 * en el árbol. No toca los incluidos opcionales: el usuario pudo haberlos quitado.
 */
export function reconciliarCombosRequeridos(
  recursos: RecursoCosteo[],
  catalogo: ItemRow[],
  costosManuales: Record<number, number>,
  idDe: (itemId: number) => string,
): RecursoCosteo[] {
  const conocidos: RecursoCosteo[] = [...recursos]
  const creados: RecursoCosteo[] = []
  const expandidos = new Set<string>()

  const buscar = (itemId: number, parentId: string) =>
    conocidos.find(r => r.esCombo && r.itemId === itemId && r.comboParentId === parentId)

  const walk = (combos: ComboDisponible[], parentId: string, parentQty: number, path: Set<number>) => {
    for (const combo of combos) {
      if (path.has(combo.productoSecundarioId)) continue
      const existente = buscar(combo.productoSecundarioId, parentId)
      let childId = existente?.id
      let childQty = existente ? (existente.cantidad || parentQty) : 0
      const entra = Number(combo.nuevoIncluido) === 1
        && Number(combo.nuevoRequerido) === 1
        && Number(combo.nuevoCantidad) > 0
      if (!existente && entra) {
        childQty = cantidadIncluida(parentQty, combo.nuevoCantidad)
        childId = idDe(combo.productoSecundarioId)
        const nuevo = recursoDeCombo(
          {
            id: combo.productoSecundarioId,
            descripcion: combo.nombre,
            tipoItem: combo.tipoItem,
            tipoProducto: combo.tipoProducto,
          },
          childId,
          parentId,
          childQty,
          costoInicial(combo.manejoCostos, combo.costosManuales),
        )
        conocidos.push(nuevo)
        creados.push(nuevo)
      }
      if (childId && combo.hijos?.length) {
        const next = new Set(path)
        next.add(combo.productoSecundarioId)
        walk(combo.hijos, childId, childQty, next)
      }
    }
  }

  for (let i = 0; i < conocidos.length; i++) {
    const rec = conocidos[i]
    if (expandidos.has(rec.id)) continue
    expandidos.add(rec.id)
    const item = catalogo.find(it => it.id === rec.itemId)
    if (!item?.combosPrincipal?.length) continue
    const tree = buildCombosDisponibles(item.combosPrincipal, catalogo, costosManuales)
    const qty = rec.categoria === 'RECURSO_HUMANO'
      ? (rec.cantidad || 1) * (rec.personas || 1)
      : (rec.cantidad || 1)
    walk(tree, rec.id, qty, new Set([rec.itemId]))
  }

  return creados
}
