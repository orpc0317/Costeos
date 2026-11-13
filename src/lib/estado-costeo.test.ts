import { describe, expect, it } from 'vitest'
import {
  ESTADO_CONTRATO,
  ESTADO_CONTRATO_OPCIONES,
  ESTADO_COSTEO,
  ESTADO_COSTEO_OPCIONES,
  esBorradorCosteo,
  labelEstadoContrato,
  labelEstadoCosteo,
} from './constants'

describe('ESTADO_COSTEO', () => {
  it('guarda el ciclo en orden', () => {
    expect(ESTADO_COSTEO_OPCIONES.map((o) => [o.value, o.label])).toEqual([
      [0, 'Borrador'],
      [1, 'Autorizar'],
      [2, 'Preparacion'],
      [3, 'Vigente'],
      [4, 'Historico'],
      [5, 'Cancelado'],
    ])
    expect(ESTADO_COSTEO.BORRADOR).toBe(0)
    expect(ESTADO_COSTEO.CANCELADO).toBe(5)
  })

  it('etiqueta el codigo y trata el borrador como el unico editable', () => {
    expect(labelEstadoCosteo(ESTADO_COSTEO.VIGENTE)).toBe('Vigente')
    expect(labelEstadoCosteo(9)).toBe('9')
    expect(esBorradorCosteo(ESTADO_COSTEO.BORRADOR)).toBe(true)
    expect(esBorradorCosteo(ESTADO_COSTEO.AUTORIZAR)).toBe(false)
    expect(esBorradorCosteo(undefined)).toBe(false)
  })

  it('el contrato usa los mismos codigos sin Historico', () => {
    expect(ESTADO_CONTRATO_OPCIONES.map((o) => [o.value, o.label])).toEqual([
      [0, 'Borrador'],
      [1, 'Autorizar'],
      [2, 'Preparacion'],
      [3, 'Vigente'],
      [5, 'Cancelado'],
    ])
    expect(ESTADO_CONTRATO.CANCELADO).toBe(ESTADO_COSTEO.CANCELADO)
    expect(labelEstadoContrato(ESTADO_CONTRATO.VIGENTE)).toBe('Vigente')
    expect(labelEstadoContrato(ESTADO_COSTEO.HISTORICO)).toBe('4')
  })
})
