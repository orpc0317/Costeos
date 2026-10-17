import { describe, expect, it } from 'vitest'
import { detectarSimilares, similitud } from './similarity'

describe('similitud', () => {
  it('trata como idénticos nombres que solo difieren en "DE"', () => {
    expect(similitud('JEFE DE GRUPO', 'JEFE GRUPO')).toBe(1)
  })

  it('trata como idénticos nombres que solo difieren en designación societaria', () => {
    expect(similitud('EMPRESA XYZ, S.A.', 'EMPRESA XYZ S.R.L.')).toBe(1)
  })

  it('marca como muy similares variantes de grupo A vs B', () => {
    expect(similitud('JEFE GRUPO A', 'JEFE GRUPO B')).toBeGreaterThanOrEqual(0.85)
    expect(similitud('JEFE GRUPO A', 'JEFE GRUPO B')).toBeLessThan(1)
  })
})

describe('detectarSimilares', () => {
  const existentes = [
    { id: 1, descripcion: 'JEFE DE GRUPO' },
    { id: 2, descripcion: 'SUPERVISOR NOCTURNO' },
  ]

  it('devuelve el 100% idéntico (R18)', () => {
    const hits = detectarSimilares('JEFE GRUPO', existentes)
    expect(hits[0]).toMatchObject({ id: 1, pct: 100 })
  })

  it('excluye el id en edición', () => {
    const hits = detectarSimilares('JEFE GRUPO', existentes, 0.85, 1)
    expect(hits.find((h) => h.id === 1)).toBeUndefined()
  })

  it('no advierte si no llega al umbral', () => {
    expect(detectarSimilares('RADIO MOTOROLA', existentes)).toEqual([])
  })
})
