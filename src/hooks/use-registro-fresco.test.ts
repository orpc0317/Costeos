import { describe, expect, it } from 'vitest'
import { reemplazarFila } from './use-registro-fresco'

describe('reemplazarFila', () => {
  it('sustituye solo la fila del mismo id', () => {
    const rows = [
      { id: 1, nombre: 'VIEJO' },
      { id: 2, nombre: 'OTRO' },
    ]
    const next = reemplazarFila(rows, { id: 1, nombre: 'NUEVO' })
    expect(next[0]).toEqual({ id: 1, nombre: 'NUEVO' })
    expect(next[1]).toEqual(rows[1])
    expect(next).not.toBe(rows)
  })

  it('deja la lista igual si el id no esta', () => {
    const rows = [{ id: 1, nombre: 'A' }]
    expect(reemplazarFila(rows, { id: 9, nombre: 'Z' })).toBe(rows)
  })
})
