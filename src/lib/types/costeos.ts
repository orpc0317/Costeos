// src/lib/types/costeos.ts

export type Moneda = 'GTQ' | 'USD';
export type EstadoContrato = 'BORRADOR' | 'APROBADO' | 'VIGENTE' | 'TERMINADO';
export type CategoriaItem = 'RECURSO_HUMANO' | 'EQUIPO' | 'ARTICULO' | 'SERVICIO';
export type TipoCosto = 'MENSUAL' | 'UNICO';

/**
 * Representa un sub-ítem del combo tal como está definido en el catálogo de Items.
 * Se almacena en el RecursoCosteo primario para que el EditorPanel pueda mostrar
 * la pestaña Combo sin necesidad de consultar la BD.
 */
export interface ComboDisponible {
  comboId: number                    // DetalleCombo.id (PK de la relación)
  productoSecundarioId: number       // ID del ítem secundario en el catálogo local
  nombre: string                     // descripcion del ítem secundario
  unidadMedida?: string              // unidad de medida del ítem secundario
  nuevoCantidad: number
  nuevoIncluido: number              // 1=incluido automáticamente, 0=opcional
  nuevoRequerido: number             // 1=no se puede quitar, 0=opcional
  manejoCostos: number               // para determinar el costo (2=manual, 99=no aplica, etc.)
  costosManuales?: number            // último costo registrado si manejoCostos=2
  hijos?: ComboDisponible[]          // combos anidados del sub-ítem
}

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
  itemId: number; // Referencia al catálogo local
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

// Nivel 4 (Opcional): Bonos asociados a un Recurso
export interface BonoCosteo {
  id: string; // ID único interno en el árbol
  erpBonoId: string; // ID del catálogo de ERP
  nombre: string;
  costoUnitario: number;
  precioVentaUnitario?: number;
}

// Nivel 3: Recurso asignado a un Puesto
export interface RecursoCosteo {
  id: string;
  itemId: number;
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
  
  bonos?: BonoCosteo[];

  // Combos del catálogo disponibles para este recurso (solo en el recurso primario, no en esCombo)
  // Permite que el EditorPanel muestre la pestaña Combo sin consultar la BD
  combosDisponibles?: ComboDisponible[];

  // Combo: indica que este recurso es un sub-ítem de otro recurso en el mismo nodo
  esCombo?: boolean;
  comboParentId?: string; // ID del RecursoCosteo primario (puede ser temp 'REC-...' o ID real de BD)

}


export interface NodoCosteo {
  id: string;
  nombre: string;
  nivel: number;
  
  // Ubicación (opcional)
  direccion?: string;
  direccionSecuencia?: number; // Para indicar si se seleccionó una dirección operativa existente
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
