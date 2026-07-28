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
  sitios: [
    {
      id: 'SIT-001',
      nombre: 'Oficinas Centrales',
      direccion: 'Zona 10',
      pais: 'Guatemala',
      departamento: 'Guatemala',
      municipio: 'Guatemala',
      recursosSinPuesto: [],
      puestos: [
        {
          id: 'PUE-001',
          nombre: 'Garita Principal',
          recursos: [
            {
              id: 'REC-001',
              erpItemId: 10,
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
                    { id: 'ITR-001', erpItemId: 1, nombre: 'Camisa Uniforme', categoria: 'ARTICULO', tipoCosto: 'UNICO', cantidad: 2, costoUnitario: 150 },
                    { id: 'ITR-002', erpItemId: 2, nombre: 'Pantalón Uniforme', categoria: 'ARTICULO', tipoCosto: 'UNICO', cantidad: 2, costoUnitario: 200 },
                    { id: 'ITR-003', erpItemId: 3, nombre: 'Zapatos de Seguridad', categoria: 'ARTICULO', tipoCosto: 'UNICO', cantidad: 1, costoUnitario: 400 },
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
