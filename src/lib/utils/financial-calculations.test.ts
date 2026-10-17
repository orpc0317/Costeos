import { describe, expect, it } from 'vitest'
import type { Cliente, NodoCosteo, ProyectoCosteo, RecursoCosteo } from '../types/costeos'
import { calcularResumenFinanciero } from './financial-calculations'

const cliente: Cliente = {
  id: '1',
  razonSocial: 'CLIENTE PRUEBA',
  nit: '123',
  direccionFiscal: 'X',
}

function recurso(partial: Partial<RecursoCosteo> & Pick<RecursoCosteo, 'id' | 'nombre' | 'categoria' | 'tipoCosto'>): RecursoCosteo {
  return {
    itemId: 1,
    cantidad: 1,
    costoUnitario: 0,
    recetas: [],
    ...partial,
  }
}

function nodo(partial: Partial<NodoCosteo> & Pick<NodoCosteo, 'id' | 'nombre'>): NodoCosteo {
  return {
    nivel: 1,
    nodos: [],
    recursos: [],
    ...partial,
  }
}

function proyecto(over: Partial<ProyectoCosteo> = {}): ProyectoCosteo {
  return {
    id: '10',
    empresaId: 1,
    cliente,
    nombreProyecto: 'PROYECTO',
    fechaInicio: '2026-01-01',
    plazoMeses: 24,
    moneda: 'GTQ',
    estado: 'BORRADOR',
    nodos: [],
    recursos: [],
    porcentajeOverhead: 0,
    porcentajeContingencia: 0,
    ...over,
  }
}

describe('calcularResumenFinanciero', () => {
  it('MENSUAL × plazo + UNICO (ejemplo de docs/flujo-costeo.md)', () => {
    const resumen = calcularResumenFinanciero(
      proyecto({
        recursos: [
          recurso({
            id: 'rh',
            nombre: 'GUARDIA',
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            costoUnitario: 5000,
            precioVentaUnitario: 8000,
          }),
          recurso({
            id: 'eq',
            nombre: 'RADIO',
            categoria: 'EQUIPO',
            tipoCosto: 'UNICO',
            costoUnitario: 3000,
          }),
        ],
      }),
    )

    expect(resumen.totalCostoMensual).toBe(5000)
    expect(resumen.totalCostoUnico).toBe(3000)
    expect(resumen.totalCostoProyecto).toBe(5000 * 24 + 3000)
    expect(resumen.totalVentaMensual).toBe(8000)
    expect(resumen.totalVentaProyecto).toBe(8000 * 24)
    expect(resumen.totalPersonas).toBe(1)
  })

  it('en RH el factor es cantidad × personas', () => {
    const resumen = calcularResumenFinanciero(
      proyecto({
        plazoMeses: 1,
        recursos: [
          recurso({
            id: 'rh',
            nombre: 'GUARDIA',
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            cantidad: 2,
            personas: 3,
            costoUnitario: 1000,
            horasSemana: 44,
          }),
        ],
      }),
    )

    expect(resumen.totalCostoMensual).toBe(6000)
    expect(resumen.totalPersonas).toBe(6)
    expect(resumen.totalHorasHombre).toBe(88)
  })

  it('suma recetas al costo (no a la venta) y escala por cantidad del padre', () => {
    const resumen = calcularResumenFinanciero(
      proyecto({
        plazoMeses: 12,
        recursos: [
          recurso({
            id: 'rh',
            nombre: 'GUARDIA',
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            cantidad: 2,
            costoUnitario: 0,
            recetas: [
              {
                id: 'r1',
                recetaCatalogoId: '1',
                nombre: 'SALARIOS',
                items: [
                  {
                    id: 'i1',
                    itemId: 2,
                    nombre: 'IGSS',
                    categoria: 'SERVICIO',
                    tipoCosto: 'MENSUAL',
                    cantidad: 1,
                    costoUnitario: 50,
                  },
                  {
                    id: 'i2',
                    itemId: 3,
                    nombre: 'CAMISA',
                    categoria: 'ARTICULO',
                    tipoCosto: 'UNICO',
                    cantidad: 1,
                    costoUnitario: 100,
                  },
                ],
              },
            ],
          }),
        ],
      }),
    )

    expect(resumen.totalCostoMensual).toBe(100)
    expect(resumen.totalCostoUnico).toBe(200)
    expect(resumen.totalCostoProyecto).toBe(100 * 12 + 200)
    expect(resumen.totalVentaProyecto).toBe(0)
  })

  it('aplica overhead y luego contingencia sobre el costo ya inflado', () => {
    const resumen = calcularResumenFinanciero(
      proyecto({
        plazoMeses: 12,
        porcentajeOverhead: 10,
        porcentajeContingencia: 10,
        recursos: [
          recurso({
            id: 'rh',
            nombre: 'GUARDIA',
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            costoUnitario: 10000,
          }),
        ],
      }),
    )

    // 10000*12 = 120000 → +10% OH = 132000 → +10% cont = 145200
    expect(resumen.totalCostoProyecto).toBe(145200)
  })

  it('con nodo seleccionado solo cuenta ese subárbol', () => {
    const sitioA = nodo({
      id: 'a',
      nombre: 'SITIO A',
      recursos: [
        recurso({
          id: 'ra',
          nombre: 'GUARDIA A',
          categoria: 'RECURSO_HUMANO',
          tipoCosto: 'MENSUAL',
          costoUnitario: 1000,
        }),
      ],
    })
    const sitioB = nodo({
      id: 'b',
      nombre: 'SITIO B',
      recursos: [
        recurso({
          id: 'rb',
          nombre: 'GUARDIA B',
          categoria: 'RECURSO_HUMANO',
          tipoCosto: 'MENSUAL',
          costoUnitario: 9000,
        }),
      ],
    })

    const todo = calcularResumenFinanciero(proyecto({ plazoMeses: 1, nodos: [sitioA, sitioB] }))
    const soloA = calcularResumenFinanciero(
      proyecto({ plazoMeses: 1, nodos: [sitioA, sitioB] }),
      { type: 'NODO', id: 'a' },
    )

    expect(todo.totalCostoMensual).toBe(10000)
    expect(soloA.totalCostoMensual).toBe(1000)
  })

  it('si plazo es 0 usa 1 para no anular el mensual', () => {
    const resumen = calcularResumenFinanciero(
      proyecto({
        plazoMeses: 0,
        recursos: [
          recurso({
            id: 'rh',
            nombre: 'GUARDIA',
            categoria: 'RECURSO_HUMANO',
            tipoCosto: 'MENSUAL',
            costoUnitario: 5000,
          }),
        ],
      }),
    )

    expect(resumen.totalCostoProyecto).toBe(5000)
  })
})
