import {
  LayoutDashboard,
  FileText,
  Users,
  UserRound,
  Settings,
  Building2,
  Calculator,
  Network,
  Tags,
  Package,
  Layers,
  Truck,
  ShoppingCart,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import { PERMISOS } from '@/lib/permisos'
import { MODULE_ACCENT, type ModuleAccent } from '@/lib/ui-accent'

export type NavDestino = {
  label: string
  href: string
  icon: LucideIcon
  permiso?: string
  exact?: boolean
  /** Nombre en Title Case para la portada. El sidebar sigue usando `label`. */
  titulo?: string
  detalle?: string
  acento?: ModuleAccent
  children?: NavDestino[]
}

export type ModuloPortada = {
  href: string
  titulo: string
  icon: LucideIcon
  tarjetas: {
    href: string
    titulo: string
    detalle: string
    icon: LucideIcon
    acento: ModuleAccent
  }[]
}

/**
 * Menú del sidebar. La portada sale de este mismo árbol.
 * `titulo`, `detalle` y `acento` son de la portada; el sidebar no los usa.
 */
export const NAV_ITEMS: NavDestino[] = [
  {
    label: 'DASHBOARD',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
    permiso: PERMISOS.DAS_HOM,
  },
  {
    label: 'COSTEOS',
    titulo: 'Costeos',
    href: '/costeos',
    icon: Calculator,
    permiso: PERMISOS.COS_CAT,
    detalle: 'Listado de costeos',
    acento: MODULE_ACCENT.costeos,
  },
  {
    label: 'COMPRAS',
    titulo: 'Compras',
    href: '/dashboard/compras',
    icon: ShoppingCart,
    children: [
      {
        label: 'Solicitudes',
        href: '/dashboard/compras/solicitudes',
        icon: ClipboardList,
        permiso: PERMISOS.SOL_COM,
        detalle: 'Solicitudes de compra',
        acento: MODULE_ACCENT.solicitudes,
      },
      {
        label: 'Cotizaciones',
        href: '/dashboard/compras/cotizaciones',
        icon: FileText,
        permiso: PERMISOS.COT_COM,
        detalle: 'Cotizaciones de proveedores',
        acento: MODULE_ACCENT.cotizaciones,
      },
    ],
  },
  {
    label: 'CONFIGURACION',
    titulo: 'Configuracion',
    href: '/dashboard/configuracion',
    icon: Settings,
    children: [
      {
        label: 'Empresas',
        href: '/dashboard/configuracion/empresas',
        icon: Building2,
        permiso: PERMISOS.EMP_CAT,
        detalle: 'Empresas del grupo',
        acento: MODULE_ACCENT.empresas,
      },
      {
        label: 'Clientes',
        href: '/dashboard/configuracion/clientes',
        icon: UserRound,
        permiso: PERMISOS.CLI_CAT,
        detalle: 'Clientes para costeos',
        acento: MODULE_ACCENT.clientes,
      },
      {
        label: 'Proveedores',
        href: '/dashboard/configuracion/proveedores',
        icon: Truck,
        permiso: PERMISOS.PRV_CAT,
        detalle: 'Proveedores de compra',
        acento: MODULE_ACCENT.proveedores,
      },
      {
        label: 'Tipos Costeo',
        href: '/dashboard/configuracion/tipos-costeo',
        icon: Network,
        permiso: PERMISOS.TCO_CAT,
        detalle: 'Tipos de estructura de costeo',
        acento: MODULE_ACCENT.tiposCosteo,
      },
      {
        label: 'Categorias',
        href: '/dashboard/configuracion/categorias',
        icon: Tags,
        permiso: PERMISOS.CAT_CAT,
        detalle: 'Categorias de items',
        acento: MODULE_ACCENT.categorias,
      },
      {
        label: 'Tipos Combo',
        href: '/dashboard/configuracion/tipos-combo',
        icon: Layers,
        permiso: PERMISOS.TCB_CAT,
        detalle: 'Tipos de combo',
        acento: MODULE_ACCENT.tiposCombo,
      },
      {
        label: 'Items',
        href: '/dashboard/configuracion/items',
        icon: Package,
        permiso: PERMISOS.ITE_CAT,
        detalle: 'Catalogo de items',
        acento: MODULE_ACCENT.items,
      },
      {
        label: 'Usuarios',
        href: '/dashboard/configuracion/usuarios',
        icon: Users,
        permiso: PERMISOS.USU_CAT,
        detalle: 'Cuentas y permisos',
        acento: MODULE_ACCENT.usuarios,
      },
    ],
  },
]

function permitido(permiso: string | undefined, permisos: string[]) {
  return !permiso || permisos.includes(permiso)
}

/** Misma regla que el sidebar: sin código, o con el código en la lista. */
export function menuVisible(permisos: string[]): NavDestino[] {
  return NAV_ITEMS.flatMap((item) => {
    if (!item.children) {
      return permitido(item.permiso, permisos) ? [item] : []
    }
    const children = item.children.filter((child) => permitido(child.permiso, permisos))
    return children.length ? [{ ...item, children }] : []
  })
}

function tarjetaDe(destino: NavDestino): ModuloPortada['tarjetas'][number] {
  return {
    href: destino.href,
    titulo: destino.titulo ?? destino.label,
    detalle: destino.detalle ?? '',
    icon: destino.icon,
    acento: destino.acento ?? MODULE_ACCENT.dashboard,
  }
}

/**
 * Pestañas de la portada. Dashboard no es pestaña: esa pantalla es la portada.
 * Un módulo sin destinos visibles no aparece.
 */
export function modulosPortada(permisos: string[]): ModuloPortada[] {
  return menuVisible(permisos)
    .filter((item) => item.href !== '/dashboard')
    .map((item) => ({
      href: item.href,
      titulo: item.titulo ?? item.label,
      icon: item.icon,
      tarjetas: (item.children?.length ? item.children : [item]).map(tarjetaDe),
    }))
}
