// src/lib/types/costeos.ts

export type Moneda = 'GTQ' | 'USD';
export type EstadoContrato = 'BORRADOR' | 'APROBADO' | 'VIGENTE' | 'TERMINADO';
export type CategoriaItem = 'RECURSO_HUMANO' | 'EQUIPO' | 'ARTICULO' | 'SERVICIO';
export type TipoCosto = 'MENSUAL' | 'UNICO';

export interface Cliente {
  id: string; // ERP ID o ID temporal si es nuevo
  codigo?: string;
  razonSocial: string;
  nit: string;
  direccionFiscal: string;
}

// Representa un item base en el catálogo del ERP
export interface ItemCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaItem;
  tipoCosto: TipoCosto;
  costoBase: number;
  precioVentaBase?: number; // Para recursos que se venden directamente
  recetaIds?: string[]; // IDs de recetas asociadas por defecto
}

// Representa una receta en el catálogo del ERP
export interface RecetaCatalogo {
  id: string;
  nombre: string;
  items: {
    itemCatalogoId: string;
    cantidadDefecto: number;
    esOpcional: boolean;
  }[];
}

// ==========================================
// ESTRUCTURA DEL COSTEO (Árbol)
// ==========================================

// Nivel 4 y 5: Items dentro de Recetas en un Puesto
export interface ItemRecetaCosteo {
  id: string; // ID único en el árbol
  erpItemId: number; // Referencia al catálogo ERP
  nombre: string; // Copia para no depender del catálogo todo el tiempo
  categoria: CategoriaItem;
  tipoCosto: TipoCosto;
  cantidad: number;
  costoUnitario: number;
  // Para sub-recetas (hasta 4 niveles de profundidad)
  subRecetas?: RecetaCosteo[]; 
}

export interface RecetaCosteo {
  id: string;
  recetaCatalogoId: string; // ERP puede usar string ej 'ERP-123'
  nombre: string;
  items: ItemRecetaCosteo[];
}

// Nivel 3: Recurso asignado a un Puesto
export interface RecursoCosteo {
  id: string;
  erpItemId: number;
  nombre: string;
  categoria: CategoriaItem;
  tipoCosto: TipoCosto;
  cantidad: number;
  costoUnitario: number;
  precioVentaUnitario?: number;
  precioVentaOrigen?: 'LISTA' | 'MANUAL';
  recetas: RecetaCosteo[];
}

export interface PuestoCosteo {
  id: string;
  nombre: string;
  turnoCodigo?: number;
  uniformeCodigo?: string;
  personas?: number;
  horasSemana?: number;
  recursos: RecursoCosteo[];
}

// Nivel 1: Sitio dentro del Contrato
export interface SitioCosteo {
  id: string;
  nombre: string;
  direccion: string;
  pais: string;
  departamento: string;
  municipio: string;
  latitud?: number;
  longitud?: number;
  puestos: PuestoCosteo[];
  // Recursos que no están en un puesto específico (ej. Coordinador de sitio)
  recursosSinPuesto: RecursoCosteo[]; 
}

// Nivel 0: Raíz del Costeo (Contrato)
export interface ProyectoCosteo {
  id: string;
  empresaId: number;
  cliente: Cliente;
  numeroContrato?: string;
  nombreProyecto: string;
  fechaInicio: string;
  plazoMeses: number;
  moneda: Moneda;
  estado: EstadoContrato;
  sitios: SitioCosteo[];
  porcentajeOverhead: number;
  porcentajeContingencia: number;
}
