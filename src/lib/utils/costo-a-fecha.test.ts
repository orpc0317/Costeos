import { describe, expect, it } from 'vitest'
import { costoHasta, fechaEvaluacion } from './costo-a-fecha'

describe('costoHasta', () => {
  it('toma el dia de la fecha de inicio como tope', () => {
    expect(costoHasta('2027-01-01')).toEqual({
      fecha: { lte: new Date('2027-01-01T00:00:00.000Z') },
    })
    expect(costoHasta(new Date('2027-01-01T15:30:00.000Z'))).toEqual({
      fecha: { lte: new Date('2027-01-01T00:00:00.000Z') },
    })
  })

  it('no filtra si no hay fecha', () => {
    expect(costoHasta(undefined)).toEqual({})
    expect(costoHasta(null)).toEqual({})
  })

  it('evalua con la fecha de la version y ignora 1900-01-01', () => {
    const inicio = new Date('2027-01-01T00:00:00.000Z')
    const vacia = new Date('1900-01-01T00:00:00.000Z')
    expect(fechaEvaluacion(inicio, vacia)).toEqual(inicio)
    expect(fechaEvaluacion(vacia, inicio)).toEqual(inicio)
  })
})
