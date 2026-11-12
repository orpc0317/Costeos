import { describe, expect, it } from 'vitest'
import type { RecursoCosteo } from '@/lib/types/costeos'
import type { DetalleComboRow, ItemRow } from '@/lib/types/items'
import { expandirCombosIncluidos, reconciliarCombosRequeridos } from './combos'

function combo(
  id: number,
  principal: number,
  secundario: number,
  incluido: number,
  requerido: number,
  cantidad = 1,
): DetalleComboRow {
  return {
    id,
    empresaId: 1,
    tipoItem: 3,
    productoPrincipalId: principal,
    productoSecundarioId: secundario,
    nuevoCantidad: cantidad,
    nuevoIncluido: incluido,
    nuevoRequerido: requerido,
    renovacionCantidad: 0,
    renovacionIncluido: 0,
    renovacionRequerido: 0,
  }
}

function item(
  id: number,
  descripcion: string,
  manejoCostos: number,
  combos: DetalleComboRow[] = [],
  tipoItem = 3,
  tipoProducto = 0,
): ItemRow {
  return {
    id,
    descripcion,
    manejoCostos,
    tipoItem,
    tipoProducto,
    combosPrincipal: combos,
  } as ItemRow
}

function recurso(partial: Partial<RecursoCosteo> & Pick<RecursoCosteo, 'id' | 'itemId' | 'nombre'>): RecursoCosteo {
  return {
    categoria: 'SERVICIO',
    tipoCosto: 'MENSUAL',
    cantidad: 1,
    costoUnitario: 0,
    recetas: [],
    ...partial,
  }
}

describe('expandirCombosIncluidos', () => {
  const sueldos = item(20, 'SUELDOS', 99, [
    combo(3, 20, 31, 1, 1),
    combo(4, 20, 32, 0, 0),
  ])
  const financieros = item(21, 'FINANCIEROS', 99, [
    combo(5, 21, 41, 1, 1),
  ])
  const aguinaldo = item(31, 'AGUINALDO', 3)
  const opcional = item(32, 'OPCIONAL', 2)
  const tiro = item(41, 'TIRO', 2)
  const guardia = item(10, 'GUARDIA', 99, [
    combo(1, 10, 20, 1, 1),
    combo(2, 10, 21, 1, 1),
  ], 3, 1)
  const catalogo = [guardia, sueldos, financieros, aguinaldo, opcional, tiro]

  it('baja a los hijos incluidos y deja fuera al que no está incluido', () => {
    const recursos = expandirCombosIncluidos({
      combos: guardia.combosPrincipal!,
      allItems: catalogo,
      costosManuales: { 41: 10.25 },
      parentRecursoId: 'PRIMARIO',
      parentCantidad: 2,
      idDe: (itemId) => `C${itemId}`,
    })

    expect(recursos.map(r => r.itemId)).toEqual([20, 31, 21, 41])
    expect(recursos.find(r => r.itemId === 32)).toBeUndefined()
    expect(recursos.find(r => r.itemId === 31)?.comboParentId).toBe('C20')
    expect(recursos.find(r => r.itemId === 41)?.comboParentId).toBe('C21')
    expect(recursos.find(r => r.itemId === 20)?.cantidad).toBe(2)
    expect(recursos.find(r => r.itemId === 31)?.cantidad).toBe(2)
    expect(recursos.find(r => r.itemId === 41)?.costoUnitario).toBe(10.25)
    expect(recursos.find(r => r.itemId === 31)?.costoUnitario).toBe(0)
  })
})

describe('reconciliarCombosRequeridos', () => {
  const sueldos = item(20, 'SUELDOS', 99, [combo(3, 20, 31, 1, 1)])
  const financieros = item(21, 'FINANCIEROS', 99, [
    combo(5, 21, 41, 1, 1),
    combo(6, 21, 42, 1, 0),
  ])
  const guardia = item(10, 'GUARDIA', 99, [
    combo(1, 10, 20, 1, 1),
    combo(2, 10, 21, 1, 1),
  ], 3, 1)
  const catalogo = [
    guardia,
    sueldos,
    financieros,
    item(31, 'AGUINALDO', 3),
    item(41, 'TIRO', 2),
    item(42, 'OPCIONAL INCLUIDO', 2),
  ]

  it('reincorpora solo los requeridos que faltan bajo el padre que ya está', () => {
    const presentes = [
      recurso({ id: 'P', itemId: 10, nombre: 'GUARDIA', categoria: 'RECURSO_HUMANO', cantidad: 1, personas: 1 }),
      recurso({ id: 'S', itemId: 20, nombre: 'SUELDOS', esCombo: true, comboParentId: 'P' }),
      recurso({ id: 'F', itemId: 21, nombre: 'FINANCIEROS', esCombo: true, comboParentId: 'P' }),
      recurso({ id: 'CAP', itemId: 41, nombre: 'TIRO', esCombo: true, comboParentId: 'F', costoUnitario: 10.25 }),
    ]

    const faltantes = reconciliarCombosRequeridos(presentes, catalogo, { 41: 10.25 }, (itemId) => `N${itemId}`)

    expect(faltantes.map(r => r.itemId)).toEqual([31])
    expect(faltantes[0].comboParentId).toBe('S')
    expect(faltantes.find(r => r.itemId === 42)).toBeUndefined()
    expect(faltantes.find(r => r.itemId === 41)).toBeUndefined()
  })
})
