import type { LucideIcon } from 'lucide-react'
import {
  BadgeDollarSign,
  ClipboardList,
  Clock,
  Contact,
  FileText,
  Gift,
  IdCard,
  KeyRound,
  Landmark,
  Layers,
  LayoutGrid,
  Library,
  List,
  ListTree,
  MapPin,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  RefreshCw,
  Route,
  Scale,
  Search,
  Settings2,
  Shapes,
  SlidersHorizontal,
  Type,
} from 'lucide-react'

/**
 * Ícono del título de una sección (`SegmentCard`).
 * La clave es el `label` exacto.
 *
 * Mismo título, mismo ícono. Dos títulos distintos pueden compartir ícono
 * cuando el dibujo les queda a los dos (Direccion y Direccion Fiscal).
 * Al crear una sección, elegir el ícono de Lucide que mejor nombre el título
 * y registrarlo aquí. No inventar un segundo ícono para un título que ya existe.
 */
export const ICONO_SECCION: Record<string, LucideIcon> = {
  General: FileText,
  Configuracion: SlidersHorizontal,
  'Estructura Costeo': ListTree,
  'Base Evaluacion': Scale,
  'Manejo Plazo': Clock,
  Item: Package,
  'Items Adicionales': PackagePlus,
  Financiero: BadgeDollarSign,
  Bonos: Gift,
  Nombre: Type,
  Direccion: MapPin,
  'Direccion Fiscal': MapPin,
  Combo: Layers,
  'Fuente Costeo': Receipt,
  Identificacion: IdCard,
  Otros: Shapes,
  Busqueda: Search,
  Parametros: Settings2,
  Pedido: ClipboardList,
  Detalle: List,
  Seguimiento: Route,
  Fiscal: Landmark,
  Contacto: Contact,
  Catalogos: Library,
  Acceso: KeyRound,
  Pantallas: LayoutGrid,
  Nuevo: Plus,
  Renovacion: RefreshCw,
}

export function iconoSeccion(label: string): LucideIcon | undefined {
  return ICONO_SECCION[label]
}
