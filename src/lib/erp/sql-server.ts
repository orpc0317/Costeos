/**
 * ERP Repository — Implementación Fase A
 * Lectura directa de SQL Server del ERP via mssql.
 *
 * ⚠️  NUNCA importar este archivo directamente desde Server Actions.
 *     Usar siempre: import { erp } from '@/lib/erp'
 *
 * Para activar: ERP_INTEGRATION_MODE=sqlserver (o dejar sin definir) en .env
 *
 * NOTA PARA EL EQUIPO ERP:
 * Las queries asumen la siguiente estructura en SQL Server:
 *   erp.items          — catálogo unificado (recursos, equipos, artículos, servicios)
 *   erp.categorias_item
 *   erp.recetas        — relación padre → componente con tipo_costo y es_opcional
 *   erp.lista_precios  — precios de venta por item
 *   erp.clientes
 *
 * Si las tablas tienen nombres distintos, ajustar las queries aquí sin
 * tocar types.ts ni los Server Actions.
 */

import sql from 'mssql'
import { getErpDbConnection as getPool } from '@/lib/erp-db'
import type {
  ErpRepository,
  ErpItem,
  ErpRecetaItem,
  ErpCliente,
  ErpEmpresa,
  ErpDepartamento,
  ErpMunicipio,
  ErpTurno,
  ErpUniforme,
  ErpServicioVenta,
  ErpDireccionOperativa,
  ContratoAprobadoPayload,
  ErpPushResult,
  ItemFiltros,
  ErpCategoria,
} from './types'

export class SqlServerErpRepository implements ErpRepository {

  // ── Catálogo de items ──────────────────────────────────────────────────────

  async getItems(filtros?: ItemFiltros): Promise<ErpItem[]> {
    if (!filtros?.empresaId) {
      console.warn('getItems llamado sin empresaId');
      return [];
    }

    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmEmpresa', filtros.empresaId)
      .input('PrmSearchText', filtros.busqueda ?? '')
      .execute('sp_buscar_servicios_venta')

    return result.recordset.map((r) => ({
      id:              String(r.codigo),
      codigo:          String(r.codigo),
      nombre:          r.descripcion ?? '',
      descripcion:     r.descripcion ?? undefined,
      tipo:            'SERVICIO',
      tipoCosto:       'MENSUAL',
      unidad:          r.unidad_medida ?? 'Unidad',
      costoUnitario:   0, // Se obtiene en tiempo real después
      tieneReceta:     false,
      categoriaId:     0,
      categoriaNombre: '',
      precioVenta:     r.precio_venta_cero === 1 ? 0 : null,
    }))
  }



  async getItemsCostos(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {}
    // Implementar si existe un SP para esto, por ahora mock
    return {}
  }

  async getListaPrecios(ids: string[]): Promise<Record<string, number | null>> {
    if (ids.length === 0) return {}
    // Implementar si existe un SP, por ahora mock
    return {}
  }

  // ── Recetas ────────────────────────────────────────────────────────────────

  async getRecetaItem(itemId: string): Promise<ErpRecetaItem[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('itemId', itemId)
      .query(`
        SELECT
          r.item_componente_id  AS itemId,
          i.nombre              AS itemNombre,
          i.tipo                AS itemTipo,
          c.nombre              AS itemCategoria,
          i.tipo_costo          AS itemTipoCosto,
          r.cantidad,
          i.unidad,
          i.costo_unitario      AS costoUnitario,
          i.tiene_receta        AS tieneReceta,
          r.es_opcional         AS esOpcional,
          lp.precio_venta       AS precioVenta
        FROM erp.recetas r
        INNER JOIN erp.items           i  ON i.id  = r.item_componente_id
        LEFT  JOIN erp.categorias_item c  ON c.id  = i.categoria_id
        LEFT  JOIN erp.lista_precios   lp ON lp.item_id = i.id AND lp.activo = 1
        WHERE r.item_padre_id = @itemId
          AND i.activo = 1
        ORDER BY r.orden, i.nombre
      `)

    return result.recordset.map((r) => ({
      itemId:        r.itemId,
      itemNombre:    r.itemNombre,
      itemTipo:      r.itemTipo,
      itemCategoria: r.itemCategoria ?? '',
      itemTipoCosto: r.itemTipoCosto,
      cantidad:      Number(r.cantidad),
      unidad:        r.unidad,
      costoUnitario: Number(r.costoUnitario),
      precioVenta:   r.precioVenta != null ? Number(r.precioVenta) : null,
      tieneReceta:   Boolean(r.tieneReceta),
      esOpcional:    Boolean(r.esOpcional),
    }))
  }

  // ── Clientes y Catálogos de Costeos ──────────────────────────────────────────

  async validarUsuario(usuarioId: string): Promise<{ userId: string } | null> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmUsuario', usuarioId)
      .execute('sp_validar_usuario')

    if (result.recordset.length > 0) {
      return { userId: result.recordset[0].userid }
    }
    return null
  }

  async getEmpresas(usuarioId: string): Promise<ErpEmpresa[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmUsuario', usuarioId)
      .execute('sp_usuario_empresas')

    return result.recordset.map((r) => ({
      id: r.empresa,
      nombre: r.empresa_nombre,
    }))
  }

  async getClientes(empresaId: number, busqueda: string): Promise<ErpCliente[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmEmpresa', empresaId)
      .input('PrmSearchText', busqueda)
      .execute('sp_buscar_cliente')

    return result.recordset.map((r) => ({
      id: r.clientId ?? undefined,
      codigo: r.codigo ?? undefined,
      nit: r.nit,
      nombreComercial: r.cliente_nombre,
      razonSocial: r.razon_social || r.razona_social,
      direccion: r.direccion,
      pais: r.pais,
      departamentoId: r.departamento,
      departamentoNombre: r.departamento_nombre,
      municipioId: r.municipio,
      municipioNombre: r.municipio_nombre,
      diasCredito: r.dias_credito,
    }))
  }

  async getDepartamentos(pais: string = 'GT'): Promise<ErpDepartamento[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmPais', pais)
      .execute('sp_departamentos_pais')

    return result.recordset.map((r) => ({
      id: r.departamento,
      codigo: r.departamento,
      nombre: r.departamento_nombre,
    }))
  }

  async getMunicipios(deptoId: number, pais: string = 'GT'): Promise<ErpMunicipio[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmPais', pais)
      .input('PrmDepartamento', deptoId)
      .execute('sp_municpios_departamento')

    return result.recordset.map((r) => ({
      id: r.municipio,
      codigo: r.municipio,
      nombre: r.municipio_nombre,
    }))
  }

  async validarVendedor(usuarioErp: string): Promise<string | null> {
    const pool = await getPool()
    const result = await pool.request()
      .input('PrmUsuario', usuarioErp.substring(0, 5))
      .execute('sp_validar_vendedor')

    if (result.recordset.length === 0) {
      return null
    }

    return result.recordset[0].codigo ?? null
  }

  // ── Push al ERP ────────────────────────────────────────────────────────────

  async pushContratoAprobado(payload: ContratoAprobadoPayload): Promise<ErpPushResult> {
    const pool = await getPool()
    try {
      /**
       * Stored procedure en el ERP que recibe el Contrato aprobado.
       * El SP debe:
       *   1. Crear el Cliente si es nuevo y devolver su ID
       *   2. Crear el Contrato y devolver su ID
       *   3. Registrar Sitios, Puestos y Recursos
       *
       * El JSON completo se pasa como parámetro para que el SP lo procese.
       * Esto evita múltiples viajes de red y mantiene la transacción en SQL Server.
       */
      const result = await pool
        .request()
        .input('payload_json', JSON.stringify(payload))
        .execute('erp.sp_crear_contrato_desde_costeos')

      const row = result.recordset?.[0]
      return {
        ok:              true,
        erpContratoId:   row?.contrato_id   ?? undefined,
        erpClienteId:    row?.cliente_id    ?? undefined,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido en ERP'
      return { ok: false, error: message }
    }
  }

  // ── Sincronización de Catálogos (Fase de Mantenimiento) ────────────────────

  async buscarCategorias(empresaId: number, busqueda: string): Promise<ErpCategoria[]> {
    const pool = await getPool()
    // TODO: Ajustar nombre del SP según corresponda en el ERP
    const result = await pool
      .request()
      .input('PrmEmpresa', empresaId)
      .input('PrmSearchText', busqueda)
      .execute('sp_buscar_categorias_erp')

    return result.recordset.map((r) => ({
      id: String(r.codigo),
      codigo: String(r.codigo),
      nombre: r.nombre ?? r.descripcion ?? '',
    }))
  }

  async crearCategoria(empresaId: number, nombre: string): Promise<{ codigoErp: string }> {
    const pool = await getPool()
    // TODO: Ajustar nombre del SP según corresponda en el ERP
    const result = await pool
      .request()
      .input('PrmEmpresa', empresaId)
      .input('PrmNombre', nombre)
      .execute('sp_crear_categoria_erp')

    if (!result.recordset || result.recordset.length === 0) {
      throw new Error('El ERP no devolvió un código al crear la categoría.')
    }
    
    return { codigoErp: String(result.recordset[0].codigo) }
  }

  async crearItem(empresaId: number, payload: Partial<ErpItem>): Promise<{ codigoErp: string }> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmEmpresa', empresaId)
      .input('PrmNombre', payload.nombre)
      .input('PrmDescripcion', payload.descripcion)
      .input('PrmCategoriaId', payload.categoriaId)
      .input('PrmTipoRecurso', payload.tipo)
      .input('PrmUnidad', payload.unidad)
      .execute('sp_crear_item_erp')

    if (!result.recordset || result.recordset.length === 0) {
      throw new Error('El ERP no devolvió un código al crear el ítem.')
    }
    
    return { codigoErp: String(result.recordset[0].codigo) }
  }

  // ── Catálogos operacionales ────────────────────────────────────────────────

  async getTurnos(empresaId: number): Promise<ErpTurno[]> {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('PrmEmpresa', empresaId)
        .execute('sp_buscar_turnos')
      return result.recordset.map(r => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        personas: r.personas || 0,
        lunes: r.lunes || 0,          lunesHoras: r.lunes_horas || 0,
        martes: r.martes || 0,        martesHoras: r.martes_horas || 0,
        miercoles: r.miercoles || 0,  miercolesHoras: r.miercoles_horas || 0,
        jueves: r.jueves || 0,        juevesHoras: r.jueves_horas || 0,
        viernes: r.viernes || 0,      viernesHoras: r.viernes_horas || 0,
        sabado: r.sabado || 0,        sabadoHoras: r.sabado_horas || 0,
        domingo: r.domingo || 0,      domingoHoras: r.domingo_horas || 0,
      }))
    } catch (err) {
      console.error('[SqlServerErpRepository] getTurnos:', err)
      return []
    }
  }

  async getUniformes(empresaId: number): Promise<ErpUniforme[]> {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('PrmEmpresa', empresaId)
        .execute('sp_buscar_uniformes')
      return result.recordset.map(r => ({
        codigo: String(r.codigo),
        descripcion: r.descripcion || '',
      }))
    } catch (err) {
      console.error('[SqlServerErpRepository] getUniformes:', err)
      return []
    }
  }

  async getServiciosVenta(empresaId: number, searchText: string = ''): Promise<ErpServicioVenta[]> {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('PrmEmpresa', empresaId)
        .input('PrmSearchText', searchText)
        .execute('sp_buscar_servicios_venta')
      return result.recordset.map(r => ({
        codigo:            String(r.codigo),
        descripcion:       r.descripcion || '',
        unidadMedida:      r.unidad_medida || '',
        tipoBien:          r.tipo_bien || 0,
        tipoItem:          r.tipo_item || 0,
        itemRegistro:      r.item_registro || 0,
        recurrente:        r.recurrente || 0,
        requiereDireccion: r.requiere_direccion || 0,
        precioVentaCero:   r.precio_venta_cero || 0,
        perfil:            r.perfil || 0,
        manejoCostos:      r.manejo_costos || 0,
      }))
    } catch (err) {
      console.error('[SqlServerErpRepository] getServiciosVenta:', err)
      return []
    }
  }

  async getClienteDirecciones(empresaId: number, clienteId: number): Promise<ErpDireccionOperativa[]> {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('PrmEmpresa', empresaId)
        .input('PrmCliente', clienteId)
        .execute('sp_buscar_cliente_direccion')
      return result.recordset.map(r => ({
        empresa:            r.empresa,
        cliente:            r.cliente,
        secuencia:          r.secuencia,
        nombre:             r.nombre,
        direccion:          r.direccion_nombre || r.direccion,
        pais:               r.pais,
        departamento:       String(r.departamento),
        municipio:          String(r.municipio),
        departamentoNombre: r.departamento_nombre || '',
        municipioNombre:    r.municipio_nombre || '',
      }))
    } catch (err) {
      console.error('[SqlServerErpRepository] getClienteDirecciones:', err)
      return []
    }
  }

  async buscarEmpresa(codigoEmpresa: string): Promise<{ codigo: string; nombre: string } | null> {
    try {
      const pool = await getPool()
      const result = await pool
        .request()
        .input('PrmEmpresa', codigoEmpresa)
        .execute('sp_buscar_empresa')

      if (!result.recordset || result.recordset.length === 0) return null

      const r = result.recordset[0]
      const codigo = String(r.codigo)
      const nombre = String(r.nombre ?? '')
      if (!nombre) return null

      return { codigo, nombre }
    } catch (err) {
      console.error('[SqlServerErpRepository] buscarEmpresa:', err)
      return null
    }
  }
}
