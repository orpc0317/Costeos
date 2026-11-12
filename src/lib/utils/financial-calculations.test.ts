import { describe, expect, it } from 'vitest'
import type { Cliente, NodoCosteo, ProyectoCosteo, RecursoCosteo } from '../types/costeos'
import { calcularResumenFinanciero, montosDeLinea } from './financial-calculations'

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

describe('montosDeLinea', () => {
  it('suma el ítem y todo el combo que cuelga, en venta y en costo', () => {
    const montos = montosDeLinea([
      recurso({
        id: 'guardia',
        nombre: 'GUARDIA',
        categoria: 'RECURSO_HUMANO',
        tipoCosto: 'MENSUAL',
        cantidad: 1,
        personas: 2,
        costoUnitario: 0,
        precioVentaUnitario: 8000,
        bonos: [{ id: 'b1', erpBonoId: '1', nombre: 'BONO', costoUnitario: 100 }],
      }),
      recurso({
        id: 'sueldos',
        nombre: 'SUELDOS',
        categoria: 'SERVICIO',
        tipoCosto: 'MENSUAL',
        cantidad: 2,
        costoUnitario: 0,
        precioVentaUnitario: 0,
        esCombo: true,
        comboParentId: 'guardia',
      }),
      recurso({
        id: 'aguinaldo',
        nombre: 'AGUINALDO',
        categoria: 'SERVICIO',
        tipoCosto: 'MENSUAL',
        cantidad: 2,
        costoUnitario: 300,
        precioVentaUnitario: 50,
        esCombo: true,
        comboParentId: 'sueldos',
      }),
      recurso({
        id: 'financieros',
        nombre: 'FINANCIEROS',
        categoria: 'SERVICIO',
        tipoCosto: 'MENSUAL',
        cantidad: 2,
        costoUnitario: 0,
        esCombo: true,
        comboParentId: 'guardia',
        bonos: [{ id: 'b2', erpBonoId: '2', nombre: 'OTRO', costoUnitario: 5 }],
      }),
    ], 'guardia')

    expect(montos.ventaPropia).toBe(16000)
    expect(montos.ventaTotal).toBe(16000 + 100)
    expect(montos.costoPropio).toBe(0)
    expect(montos.costoAbajo).toBe(600)
    expect(montos.bonosPropios).toBe(200)
    expect(montos.bonosAbajo).toBe(10)
    expect(montos.costoTotal).toBe(600 + 200 + 10)
  })

  it('al seleccionar un hijo, suma solo ese hijo y lo que cuelga de él', () => {
    const montos = montosDeLinea([
      recurso({
        id: 'guardia',
        nombre: 'GUARDIA',
        categoria: 'RECURSO_HUMANO',
        tipoCosto: 'MENSUAL',
        costoUnitario: 10,
        precioVentaUnitario: 80,
      }),
      recurso({
        id: 'sueldos',
        nombre: 'SUELDOS',
        categoria: 'SERVICIO',
        tipoCosto: 'MENSUAL',
        cantidad: 1,
        costoUnitario: 0,
        esCombo: true,
        comboParentId: 'guardia',
      }),
      recurso({
        id: 'aguinaldo',
        nombre: 'AGUINALDO',
        categoria: 'SERVICIO',
        tipoCosto: 'MENSUAL',
        cantidad: 1,
        costoUnitario: 30,
        precioVentaUnitario: 5,
        esCombo: true,
        comboParentId: 'sueldos',
      }),
    ], 'sueldos')

    expect(montos.ventaTotal).toBe(5)
    expect(montos.costoTotal).toBe(30)
  })
})
