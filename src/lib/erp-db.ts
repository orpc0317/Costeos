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

