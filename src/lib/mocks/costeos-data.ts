// src/lib/mocks/costeos-data.ts

import { ProyectoCosteo, ItemCatalogo, RecetaCatalogo } from '../types/costeos';

export const mockItemsCatalogo: ItemCatalogo[] = [
  { id: 'RH_01', codigo: 'RH-GUARDIA-STD', nombre: 'Guardia Estándar 12h', categoria: 'RECURSO_HUMANO', tipoCosto: 'MENSUAL', costoBase: 3500, precioVentaBase: 5000 },
  { id: 'RH_02', codigo: 'RH-COORD', nombre: 'Coordinador de Sitio', categoria: 'RECURSO_HUMANO', tipoCosto: 'MENSUAL', costoBase: 6000, precioVentaBase: 8500 },
  { id: 'EQ_01', codigo: 'EQ-RADIO', nombre: 'Radio Motorola', categoria: 'EQUIPO', tipoCosto: 'UNICO', costoBase: 1200 },
  { id: 'EQ_02', codigo: 'EQ-ARMA', nombre: 'Revólver .38', categoria: 'EQUIPO', tipoCosto: 'UNICO', costoBase: 3500 },
  { id: 'AR_01', codigo: 'AR-UNIF-CAMISA', nombre: 'Camisa Uniforme', categoria: 'ARTICULO', tipoCosto: 'UNICO', costoBase: 150 },
  { id: 'AR_02', codigo: 'AR-UNIF-PANT', nombre: 'Pantalón Uniforme', categoria: 'ARTICULO', tipoCosto: 'UNICO', costoBase: 200 },
  { id: 'AR_03', codigo: 'AR-UNIF-ZAP', nombre: 'Zapatos de Seguridad', categoria: 'ARTICULO', tipoCosto: 'UNICO', costoBase: 400 },
  { id: 'SV_01', codigo: 'SV-DATOS', nombre: 'Plan de Datos Radio', categoria: 'SERVICIO', tipoCosto: 'MENSUAL', costoBase: 100 },
];

export const mockRecetasCatalogo: RecetaCatalogo[] = [
  {
    id: 'REC_UNIFORME',
    nombre: 'Uniforme Estándar',
    items: [
      { itemCatalogoId: 'AR_01', cantidadDefecto: 2, esOpcional: false },
      { itemCatalogoId: 'AR_02', cantidadDefecto: 2, esOpcional: false },
      { itemCatalogoId: 'AR_03', cantidadDefecto: 1, esOpcional: false },
    ]
  },
  {
    id: 'REC_RADIO',
    nombre: 'Accesorios Radio',
    items: [
      { itemCatalogoId: 'SV_01', cantidadDefecto: 1, esOpcional: false },
    ]
  }
];

export const mockProyectoInicial: ProyectoCosteo = {
  id: 'PROY-001',
  empresaId: 1,
  cliente: {
    id: 'CLI-123',
    razonSocial: 'Corporación Ejemplo S.A.',
    nit: '123456-7',
    direccionFiscal: 'Ciudad'
  },
  nombreProyecto: 'Seguridad Instalaciones Centrales',
  fechaInicio: new Date().toISOString().split('T')[0],
  plazoMeses: 12,
  moneda: 'GTQ',
  estado: 'BORRADOR',
  porcentajeOverhead: 5,
  porcentajeContingencia: 2,
  tipoCosteo: {
    id: 1,
    nombre: 'Costeo Estandar',
    cantidadNiveles: 2,
    etiquetasNiveles: 'Sitio,Puesto',
    nivelConDireccion: 1,
    lineaEtiqueta: 'Líneas',
    baseEvaluacion: 'GLOBAL',
    manejoPlazo: 'LIBRE',
    fijarPlazo: 0,
  },
  nodos: [
    {
      id: 'SIT-001',
      nombre: 'Oficinas Centrales',
      nivel: 1,
      direccion: 'Zona 10',
      pais: 'Guatemala',
      departamento: 'Guatemala',
      municipio: 'Guatemala',
      nodos: [
        {
          id: 'PUE-001',
          nombre: 'Garita Principal',
          nivel: 2,
          nodos: [],
          recursos: [
            {
              id: 'REC-001',
              erpItemId: '10',
              nombre: 'Guardia Estándar 12h',
              categoria: 'RECURSO_HUMANO',
              tipoCosto: 'MENSUAL',
              cantidad: 1,
              costoUnitario: 3500,
              precioVentaUnitario: 5000,
              recetas: [
                {
                  id: 'RECC-001',
                  recetaCatalogoId: 'REC_UNIFORME',
                  nombre: 'Uniforme Estándar',
                  items: [
                    { id: 'rec-1', erpItemId: '100', nombre: 'Guardia de Seguridad', categoria: 'RECURSO_HUMANO', tipoCosto: 'MENSUAL', cantidad: 2, costoUnitario: 12000 },
                    { id: 'rec-2', erpItemId: '101', nombre: 'Supervisor', categoria: 'RECURSO_HUMANO', tipoCosto: 'MENSUAL', cantidad: 1, costoUnitario: 18000 },
                    { id: 'rec-3', erpItemId: '102', nombre: 'Radios de Comunicación', categoria: 'EQUIPO', tipoCosto: 'MENSUAL', cantidad: 3, costoUnitario: 500 }
                  ]
                }
              ]
            }
          ]
        }
      ],
      recursos: []
    }
  ],
  recursos: []
};
