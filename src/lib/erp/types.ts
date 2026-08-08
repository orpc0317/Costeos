/**
 * ERP Repository — Contrato entre Costeos y el ERP
 *
 * REGLA CRÍTICA: Este archivo define la interfaz inmutable.
 * - Las implementaciones (sql-server.ts, api-rest.ts) se adaptan a este contrato.
 * - El contrato NUNCA cambia cuando se hace el switch Fase A → Fase C.
 * - Los Server Actions SIEMPRE importan `erp` desde `@/lib/erp` — nunca directamente
 *   de sql-server.ts ni de api-rest.ts.
 *
 * Jerarquía del negocio:
 *   CLIENTE → CONTRATO → SITIO → PUESTO → RECURSO → RECETA (hasta 4 niveles)
 */

// ─── Filtros ────────────────────────────────────────────────────────────────

export type ItemFiltros = {
  empresaId: number
  busqueda?: string
  tipo?: TipoRecurso
  categoriaId?: number
  tieneReceta?: boolean
}

export type ClienteFiltros = {
  busqueda?: string
  activo?: boolean
}

// ─── Enums y tipos base ──────────────────────────────────────────────────────

/**
 * Tipos de recurso que puede tener un Puesto.
 * Vienen del catálogo del ERP.
 */
export type TipoRecurso =
  | 'RECURSO_HUMANO' // guardias, coordinadores, personal
  | 'EQUIPO'         // armamento, radios, vehículos, computadoras
  | 'ARTICULO'       // uniformes, linternas, cuadernos
  | 'SERVICIO'       // planes de datos, seguros

/**
 * Determina cómo se aplica el costo de un item a lo largo del tiempo.
 *
 * MENSUAL: costo recurrente. Se multiplica × plazo_meses para el total.
 *   Ejemplo: salario de un guardia.
 *
 * UNICO: costo de una sola vez. No cambia con la duración del contrato.
 *   Ejemplo: compra de un radio, uniforme.
 *   Para reportes mensuales se amortiza: costo_total / plazo_meses.
 */
export type TipoCosto = 'MENSUAL' | 'UNICO'

// ─── Entidades del ERP (read-only desde Costeos) ────────────────────────────

/**
 * Item del catálogo unificado del ERP.
 * Unifica productos, equipos, artículos y servicios bajo una sola estructura.
 */
export type ErpItem = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  tipo: TipoRecurso
  categoriaId: number
  categoriaNombre: string   // ej: "SALARIOS", "COMUNICACIÓN", "ARMAMENTO", "UNIFORMES"
  tipoCosto: TipoCosto      // CLAVE para la mensualizacion de costos
  unidad: string            // "persona", "unidad", "mes", "hora", etc.
  costoUnitario: number     // costo actual (siempre en tiempo real)
  precioVenta: number | null // de la lista de precios del ERP; null = no tiene precio
  tieneReceta: boolean      // true = al seleccionar se expande la receta
}

/**
 * Item dentro de una Receta.
 * Una Receta puede tener sub-recetas hasta 4 niveles de profundidad.
 * Se usa tieneReceta = true para saber si hay que hacer recursión.
 */
export type ErpRecetaItem = {
  itemId: string
  itemNombre: string
  itemTipo: TipoRecurso
  itemCategoria: string
  itemTipoCosto: TipoCosto
  cantidad: number
  unidad: string
  costoUnitario: number
  precioVenta: number | null
  tieneReceta: boolean  // true = este item a su vez tiene sub-receta
  esOpcional: boolean   // true = el usuario puede eliminarlo de la receta
}

export type ErpCliente = {
  id?: number          // clientId (opcional porque si es nuevo no tiene)
  codigo?: string
  nit: string
  nombreComercial: string // cliente_nombre
  razonSocial: string     // razona_social
  direccion?: string
  pais?: string
  departamentoId?: number // department_codigo
  departamentoNombre?: string
  municipioId?: number    // municipio
  municipioNombre?: string
  diasCredito: number
}

export type ErpEmpresa = {
  id: number
  nombre: string
}

export type ErpDepartamento = {
  id: number
  codigo: number
  nombre: string
}

export type ErpCategoria = {
  id: string
  codigo: string
  nombre: string
}

export type ErpMunicipio = {
  id: number
  codigo: number
  nombre: string
}

export type ErpTurno = {
  codigo: number
  descripcion: string
  personas: number
  lunes: number; lunesHoras: number
  martes: number; martesHoras: number
  miercoles: number; miercolesHoras: number
  jueves: number; juevesHoras: number
  viernes: number; viernesHoras: number
  sabado: number; sabadoHoras: number
  domingo: number; domingoHoras: number
}

export type ErpUniforme = {
  codigo: string
  descripcion: string
}

export type ErpServicioVenta = {
  codigo: string
  descripcion: string
  unidadMedida: string
  tipoBien: number
  tipoItem: number
  itemRegistro: number
  recurrente: number
  requiereDireccion: number
  precioVentaCero: number
  perfil: number
  manejoCostos: number
}

export type ErpDireccionOperativa = {
  empresa: number
  cliente: number
  secuencia: number
  nombre: string
  direccion: string
  pais: string
  departamento: string
  municipio: string
  departamentoNombre: string
  municipioNombre: string
}
// ─── Payload para push al ERP (al aprobar el Contrato) ──────────────────────

/**
 * Payload completo enviado al ERP cuando se aprueba un Contrato.
 * Incluye el Cliente (existente o nuevo), la estructura completa del Contrato
 * (Sitios → Puestos → Recursos) y el resumen financiero.
 *
 * Si clienteErpId viene lleno → cliente existente.
 * Si es null y vienen clienteNit, etc. → cliente nuevo; ERP lo crea y devuelve erpClienteId.
 */
export type ContratoAprobadoPayload = {
  // Cliente
  clienteErpId?: number          // cliente existente en ERP
  clienteNit?: string            // cliente nuevo: NIT
  clienteRazonSocial?: string    // cliente nuevo: Razón Social
  clienteDireccionFiscal?: string // cliente nuevo: Dirección Fiscal
  // Contrato
  contratoNumero: string
  contratoNombre: string
  fechaInicio: string            // ISO date "YYYY-MM-DD"
  plazoMeses: number
  moneda: string                 // "GTQ" | "USD"
  // Estructura
  sitios: ContratoSitioPayload[]
  // Resumen financiero
  costoMensual: number
  costoAnual: number
  costoTotalProyecto: number
  ventaMensual: number
  ventaAnual: number
  ventaTotalProyecto: number
  grossMarginPct: number
  roiPct: number
}

export type ContratoSitioPayload = {
  nombre: string
  codigo?: string
  direccion?: string
  puestos: ContratoPuestoPayload[]
}

export type ContratoPuestoPayload = {
  nombre: string
  codigo?: string
  diasCobertura: string
  horaInicio: string
  horaFin: string
  recursos: ContratoRecursoPayload[]
}

export type ContratoRecursoPayload = {
  erpItemId: string
  itemNombre: string
  cantidad: number
  costoUnitario: number
  precioVenta?: number
}

export type ErpPushResult = {
  ok: boolean
  erpContratoId?: number
  erpClienteId?: number  // devuelto solo si se creó un cliente nuevo en ERP
  error?: string
}

// ─── Interfaz principal ──────────────────────────────────────────────────────

export interface ErpRepository {
  /**
   * Retorna el catálogo unificado de items del ERP.
   * Incluye recursos humanos, equipos, artículos y servicios.
   * Los precios son siempre en tiempo real — no cachear en MySQL de Costeos.
   */
  getItems(filtros?: ItemFiltros): Promise<ErpItem[]>

  /**
   * Obtiene costos actuales para un batch de item IDs.
   * Usar al abrir un Costeo en BORRADOR para refrescar todos los costos
   * en una sola llamada (en vez de N llamadas individuales).
   * @returns Record<erp_item_id, costo_unitario_actual>
   */
  getItemsCostos(ids: string[]): Promise<Record<string, number>>

  /**
   * Obtiene precios de venta (lista de precios) para un batch de item IDs.
   * El valor es null si el item no tiene precio en la lista.
   * @returns Record<erp_item_id, precio_venta | null>
   */
  getListaPrecios(ids: string[]): Promise<Record<string, number | null>>

  /**
   * Retorna los items de la receta de un item del ERP (nivel 1).
   * Para sub-recetas (niveles 2-4), llamar recursivamente con el itemId
   * del item de receta que tiene tieneReceta = true.
   * Máximo 4 niveles de profundidad.
   */
  getRecetaItem(itemId: string): Promise<ErpRecetaItem[]>

  /**
   * Valida si el usuario ERP existe en SQL Server.
   * Devuelve un objeto con userId si es válido, o null si no existe.
   */
  validarUsuario(usuarioId: string): Promise<{ userId: string } | null>

  /**
   * Obtiene la lista de empresas a las que el usuario tiene acceso.
   */
  getEmpresas(usuarioId: string): Promise<ErpEmpresa[]>

  /**
   * Retorna el catálogo de clientes del ERP usando el SP omni-search.
   */
  getClientes(empresaId: number, busqueda: string): Promise<ErpCliente[]>

  /**
   * Obtiene departamentos por país.
   */
  getDepartamentos(pais?: string): Promise<ErpDepartamento[]>

  /**
   * Obtiene municipios por departamento y país.
   */
  getMunicipios(departamentoId: number, paisId: string): Promise<ErpMunicipio[]>

  /**
   * Obtiene el código de vendedor de un usuario del ERP.
   * Si no es vendedor, retorna null.
   */
  validarVendedor(usuarioErp: string): Promise<string | null>

  /**
   * Empuja un Contrato aprobado hacia el ERP.
   * Se llama UNA SOLA VEZ cuando el Contrato pasa a estado APROBADO.
   *
   * El ERP:
   *   1. Crea el cliente si es nuevo (clienteErpId viene vacío) y devuelve su ID
   *   2. Crea el contrato y devuelve su ID
   *   3. Registra los sitios, puestos y recursos
   *
   * La respuesta incluye erpClienteId (si cliente nuevo) y erpContratoId.
   */
  pushContratoAprobado(payload: ContratoAprobadoPayload): Promise<ErpPushResult>

  // ── Sincronización de Catálogos (Fase de Mantenimiento) ────────────────────

  /**
   * Busca categorías en el ERP mediante fuzzy match parcial (ej. LIKE).
   */
  buscarCategorias(empresaId: number, busqueda: string): Promise<ErpCategoria[]>

  /**
   * Crea una categoría en el ERP y devuelve el código generado.
   */
  crearCategoria(empresaId: number, nombre: string): Promise<{ codigoErp: string }>

  /**
   * Crea un ítem en el ERP y devuelve el código generado.
   */
  crearItem(empresaId: number, payload: Partial<ErpItem>): Promise<{ codigoErp: string }>

  /**
   * Obtiene los turnos disponibles para una empresa.
   */
  getTurnos(empresaId: number): Promise<ErpTurno[]>

  /**
   * Obtiene los uniformes disponibles para una empresa.
   */
  getUniformes(empresaId: number): Promise<ErpUniforme[]>

  /**
   * Obtiene los servicios de venta para una empresa.
   */
  getServiciosVenta(empresaId: number, searchText?: string): Promise<ErpServicioVenta[]>

  /**
   * Obtiene las direcciones operativas de un cliente.
   */
  getClienteDirecciones(empresaId: number, clienteId: number): Promise<ErpDireccionOperativa[]>

  /**
   * Busca una empresa en el ERP por su código.
   * Llama a sp_buscar_empresa y devuelve { codigo, nombre } o null si no existe.
   * Usado para mostrar el nombre de la empresa ERP al registrar en Costeos.
   */
  buscarEmpresa(codigoEmpresa: string): Promise<{ codigo: string; nombre: string } | null>
}

