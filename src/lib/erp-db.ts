import sql from 'mssql'

// Cacheamos el pool para no crear múltiples conexiones en desarrollo
const globalForSql = globalThis as unknown as {
  erpPool: sql.ConnectionPool | undefined
}

export async function getErpDbConnection() {
  const user = process.env.ERP_DB_USER
  const password = process.env.ERP_DB_PASSWORD
  const server = process.env.ERP_DB_SERVER
  const port = process.env.ERP_DB_PORT ? parseInt(process.env.ERP_DB_PORT) : undefined
  const instanceName = process.env.ERP_DB_INSTANCE
  const database = process.env.ERP_DB_NAME

  if (!user || !server || !database) {
    throw new Error('Faltan variables de entorno ERP_DB_*')
  }

  if (globalForSql.erpPool) {
    return globalForSql.erpPool
  }

  try {
    const pool = await sql.connect({
      user,
      password,
      server,
      port,
      database,
      options: {
        instanceName: port ? undefined : instanceName, // No enviar instanceName si hay puerto
        trustServerCertificate: true, // Para conexiones locales seguras
      }
    })
    if (process.env.NODE_ENV !== 'production') {
      globalForSql.erpPool = pool
    }
    return pool
  } catch (err) {
    console.error('Error al conectar con la base de datos del ERP:', err)
    throw err
  }
}

/**
 * Valida si un usuario existe en el ERP y está activo.
 * @param usuarioErp Nombre de usuario en el ERP
 * @returns true si existe y está activo, false en caso contrario
 */
export async function validarUsuarioERP(usuarioErp: string): Promise<boolean> {
  try {
    const pool = await getErpDbConnection()
    const request = pool.request()
    
    // Validamos que el usuario_erp exista y que activo = 1 en la tabla t_usuario
    request.input('usuarioErp', usuarioErp)
    const result = await request.query(`
      SELECT 1 
      FROM t_usuario 
      WHERE userid = @usuarioErp AND activo = 1
    `)

    return result.recordset.length > 0
  } catch (error) {
    console.error('Error al validar usuario ERP:', error)
    if (error instanceof Error) {
      throw new Error(`Error del ERP: ${error.message}`)
    }
    throw new Error('No se pudo validar el usuario en el ERP')
  }
}
