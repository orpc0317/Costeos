/**
 * Permisos por pantalla. Cada código cabe en varchar(8).
 * Cuatro flags por usuario: consultar, agregar, modificar, eliminar.
 * Cero filas en t_menu_usuario = acceso total.
 */

export const PERMISOS = {
  DAS_HOM: 'DAS.HOM',
  COS_CAT: 'COS.CAT',
  COS_NEW: 'COS.NEW',
  SOL_COM: 'SOL.COM',
  COT_COM: 'COT.COM',
  EMP_CAT: 'EMP.CAT',
  CLI_CAT: 'CLI.CAT',
  PRV_CAT: 'PRV.CAT',
  TCO_CAT: 'TCO.CAT',
  CAT_CAT: 'CAT.CAT',
  TCB_CAT: 'TCB.CAT',
  ITE_CAT: 'ITE.CAT',
  USU_CAT: 'USU.CAT',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

export type PermisosPantalla = {
  consultar: boolean
  agregar: boolean
  modificar: boolean
  eliminar: boolean
}

export type PermisoFlags = {
  indice: string
  consultar: boolean
  agregar: boolean
  modificar: boolean
  eliminar: boolean
}

export const MENUS: { indice: Permiso; nombre: string; ruta: string }[] = [
  { indice: PERMISOS.DAS_HOM, nombre: 'Dashboard', ruta: '/dashboard' },
  { indice: PERMISOS.COS_CAT, nombre: 'Costeos', ruta: '/costeos' },
  { indice: PERMISOS.COS_NEW, nombre: 'Costeador', ruta: '/costeos/nuevo' },
  { indice: PERMISOS.SOL_COM, nombre: 'Solicitudes', ruta: '/dashboard/compras/solicitudes' },
  { indice: PERMISOS.COT_COM, nombre: 'Cotizaciones', ruta: '/dashboard/compras/cotizaciones' },
  { indice: PERMISOS.EMP_CAT, nombre: 'Empresas', ruta: '/dashboard/configuracion/empresas' },
  { indice: PERMISOS.CLI_CAT, nombre: 'Clientes', ruta: '/dashboard/configuracion/clientes' },
  { indice: PERMISOS.PRV_CAT, nombre: 'Proveedores', ruta: '/dashboard/configuracion/proveedores' },
  { indice: PERMISOS.TCO_CAT, nombre: 'Tipos Costeo', ruta: '/dashboard/configuracion/tipos-costeo' },
  { indice: PERMISOS.CAT_CAT, nombre: 'Categorias', ruta: '/dashboard/configuracion/categorias' },
  { indice: PERMISOS.TCB_CAT, nombre: 'Tipos Combo', ruta: '/dashboard/configuracion/tipos-combo' },
  { indice: PERMISOS.ITE_CAT, nombre: 'Items', ruta: '/dashboard/configuracion/items' },
  { indice: PERMISOS.USU_CAT, nombre: 'Usuarios', ruta: '/dashboard/configuracion/usuarios' },
]

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  ANALISTA: 'ANALISTA',
  VIEWER: 'VIEWER',
} as const

export type Rol = (typeof ROLES)[keyof typeof ROLES]

const ALL = { consultar: true, agregar: true, modificar: true, eliminar: true }
const READ = { consultar: true, agregar: false, modificar: false, eliminar: false }
const EDIT = { consultar: true, agregar: true, modificar: true, eliminar: false }

function row(indice: string, flags: typeof ALL): PermisoFlags {
  return { indice, ...flags }
}

function pick(indices: string[], flags: typeof ALL): PermisoFlags[] {
  return indices.map((indice) => row(indice, flags))
}

/**
 * Preset al elegir un rol. ADMIN devuelve lista vacía: sin filas = acceso total.
 * El resto replica el mapa de roles que ya tenía la app, más compras
 * (esas pantallas hoy solo exigen sesión).
 */
export function presetDeRol(rol: string): PermisoFlags[] {
  const operacion = [PERMISOS.DAS_HOM, PERMISOS.COS_CAT, PERMISOS.COS_NEW, PERMISOS.SOL_COM, PERMISOS.COT_COM]
  const catalogos = [PERMISOS.EMP_CAT, PERMISOS.CLI_CAT, PERMISOS.PRV_CAT, PERMISOS.CAT_CAT, PERMISOS.TCB_CAT, PERMISOS.ITE_CAT]
  if (rol === ROLES.ADMIN) return []
  if (rol === ROLES.MANAGER) {
    return [
      ...pick(operacion, EDIT),
      ...pick(catalogos, ALL),
    ]
  }
  if (rol === ROLES.ANALISTA) {
    return [
      ...pick([PERMISOS.DAS_HOM, PERMISOS.COS_CAT, PERMISOS.COS_NEW, PERMISOS.SOL_COM, PERMISOS.COT_COM], EDIT),
      row(PERMISOS.CAT_CAT, READ),
    ]
  }
  return [
    ...pick([PERMISOS.DAS_HOM, PERMISOS.COS_CAT], READ),
    ...pick([PERMISOS.SOL_COM, PERMISOS.COT_COM], READ),
  ]
}
