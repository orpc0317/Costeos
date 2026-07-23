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
  ContratoAprobadoPayload,
  ErpPushResult,
  ItemFiltros,
  ClienteFiltros,
} from './types'

export class SqlServerErpRepository implements ErpRepository {

  // ── Catálogo de items ──────────────────────────────────────────────────────

  async getItems(filtros?: ItemFiltros): Promise<ErpItem[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('busqueda',    sql.NVarChar(200), filtros?.busqueda    ?? '')
      .input('tipo',        sql.NVarChar(30),  filtros?.tipo         ?? null)
      .input('categoriaId', sql.Int,           filtros?.categoriaId  ?? null)
      .input('tieneReceta', sql.Bit,           filtros?.tieneReceta  ?? null)
      .query(`
        SELECT
          i.id,
          i.codigo,
          i.nombre,
          i.descripcion,
          i.tipo,                       -- RECURSO_HUMANO | EQUIPO | ARTICULO | SERVICIO
          i.tipo_costo      AS tipoCosto, -- MENSUAL | UNICO
          i.unidad,
          i.costo_unitario  AS costoUnitario,
          i.tiene_receta    AS tieneReceta,
          c.id              AS categoriaId,
          c.nombre          AS categoriaNombre,
          lp.precio_venta   AS precioVenta  -- null si no está en lista de precios
        FROM erp.items i
        LEFT JOIN erp.categorias_item c  ON c.id = i.categoria_id
        LEFT JOIN erp.lista_precios   lp ON lp.item_id = i.id AND lp.activo = 1
        WHERE i.activo = 1
          AND (@busqueda    = '' OR i.nombre LIKE '%' + @busqueda + '%'
                                 OR i.codigo LIKE '%' + @busqueda + '%')
          AND (@tipo        IS NULL OR i.tipo = @tipo)
          AND (@categoriaId IS NULL OR i.categoria_id = @categoriaId)
          AND (@tieneReceta IS NULL OR i.tiene_receta = @tieneReceta)
        ORDER BY c.nombre, i.nombre
      `)

    return result.recordset.map((r) => ({
      id:              r.id,
      codigo:          r.codigo,
      nombre:          r.nombre,
      descripcion:     r.descripcion ?? undefined,
      tipo:            r.tipo,
      tipoCosto:       r.tipoCosto,
      unidad:          r.unidad,
      costoUnitario:   Number(r.costoUnitario),
      tieneReceta:     Boolean(r.tieneReceta),
      categoriaId:     r.categoriaId,
      categoriaNombre: r.categoriaNombre ?? '',
      precioVenta:     r.precioVenta != null ? Number(r.precioVenta) : null,
    }))
  }

  async getItemsCostos(ids: number[]): Promise<Record<number, number>> {
    if (ids.length === 0) return {}

    const pool = await getPool()
    const tvp  = new sql.Table()
    tvp.columns.add('id', sql.Int)
    ids.forEach((id) => tvp.rows.add(id))

    const result = await pool
      .request()
      .input('ids', tvp)
      .query(`
        SELECT i.id, i.costo_unitario AS costoUnitario
        FROM erp.items i
        INNER JOIN @ids t ON t.id = i.id
        WHERE i.activo = 1
      `)

    const map: Record<number, number> = {}
    result.recordset.forEach((r) => {
      map[r.id] = Number(r.costoUnitario)
    })
    return map
  }

  async getListaPrecios(ids: number[]): Promise<Record<number, number | null>> {
    if (ids.length === 0) return {}

    const pool = await getPool()
    const tvp  = new sql.Table()
    tvp.columns.add('id', sql.Int)
    ids.forEach((id) => tvp.rows.add(id))

    // Primero inicializar todos los ids como null
    const map: Record<number, number | null> = {}
    ids.forEach((id) => { map[id] = null })

    const result = await pool
      .request()
      .input('ids', tvp)
      .query(`
        SELECT lp.item_id AS id, lp.precio_venta AS precioVenta
        FROM erp.lista_precios lp
        INNER JOIN @ids t ON t.id = lp.item_id
        WHERE lp.activo = 1
      `)

    result.recordset.forEach((r) => {
      map[r.id] = Number(r.precioVenta)
    })
    return map
  }

  // ── Recetas ────────────────────────────────────────────────────────────────

  async getRecetaItem(itemId: number): Promise<ErpRecetaItem[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('itemId', sql.Int, itemId)
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
      .input('PrmUsuario', sql.VarChar(5), usuarioId)
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
      .input('PrmUsuario', sql.VarChar(5), usuarioId)
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
      .input('PrmEmpresa', sql.Int, empresaId)
      .input('PrmSearchText', sql.VarChar(150), busqueda)
      .execute('sp_buscar_cliente')

    return result.recordset.map((r) => ({
      id: r.clientId ?? undefined,
      codigo: r.codigo ?? undefined,
      nit: r.nit,
      nombreComercial: r.cliente_nombre,
      razonSocial: r.razon_social || r.razona_social,
      direccion: r.direccion,
      pais: r.pais,
      departamentoId: r.department_codigo,
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
      .input('PrmPais', sql.VarChar(3), pais)
      .execute('sp_departamentos_pais')

    return result.recordset.map((r) => ({
      id: r.departamento,
      nombre: r.departamento_nombre,
    }))
  }

  async getMunicipios(deptoId: number, pais: string = 'GT'): Promise<ErpMunicipio[]> {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('PrmPais', sql.VarChar(3), pais)
      .input('PrmDepartamento', sql.Int, deptoId)
      .execute('sp_municpios_departamento')

    return result.recordset.map((r) => ({
      id: r.municipio,
      nombre: r.municipio_nombre,
    }))
  }

  async validarVendedor(usuarioErp: string): Promise<string | null> {
    const pool = await getPool()
    const result = await pool.request()
      .input('PrmUsuario', sql.VarChar(5), usuarioErp.substring(0, 5))
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
        .input('payload_json', sql.NVarChar(sql.MAX), JSON.stringify(payload))
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
}
