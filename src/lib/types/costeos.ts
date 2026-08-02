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
  erpItemId: string; // Referencia al catálogo ERP
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
  erpItemId: string;
  nombre: string;
  categoria: CategoriaItem;
  tipoCosto: TipoCosto;
  cantidad: number;
  costoUnitario: number;
  precioVentaUnitario?: number;
  precioVentaOrigen?: 'LISTA' | 'MANUAL';
  recetas: RecetaCosteo[];
  
  // Nuevos campos transferidos desde PuestoCosteo
  itemServicio?: any;
  turnoCodigo?: number;
  uniformeCodigo?: string;
  personas?: number;
  horasSemana?: number;
  cubreDescanso?: number;

}

export interface NodoCosteo {
  id: string;
  nombre: string;
  nivel: number;
  
  // Ubicación (opcional)
  direccion?: string;
  pais?: string;
  departamento?: string;
  municipio?: string;
  latitud?: number;
  longitud?: number;
  
  // Cobertura (opcional)
  turnoCodigo?: number;
  uniformeCodigo?: string;
  cubreDescanso?: number;
  personas?: number;
  horasSemana?: number;
  diasCobertura?: string;
  horaInicio?: string;
  horaFin?: string;

  nodos: NodoCosteo[];
  recursos: RecursoCosteo[];
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
  nodos: NodoCosteo[];
  recursos: RecursoCosteo[]; // Líneas directas en la raíz
  porcentajeOverhead: number;
  porcentajeContingencia: number;
  tipoCosteo?: {
    id: number;
    nombre: string;
    cantidadNiveles: number;
    etiquetasNiveles: string | null;
    coloresNiveles: string | null;
    iconosNiveles: string | null;
    nivelConDireccion: number | null;
    lineaEtiqueta: string;
    manejoPlazo: 'LIBRE' | 'FIJO' | 'NO_APLICA';
    fijarPlazo: number;
    baseEvaluacion: 'GLOBAL' | 'MENSUAL';
  };
}
