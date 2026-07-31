import { getErpDbConnection } from './src/lib/erp-db';

async function main() {
  const pool = await getErpDbConnection();
  const result = await pool.request().input('PrmEmpresa', 3).execute('sp_buscar_servicios_venta');
  console.log(result.recordset[0]);
  process.exit(0);
}

main().catch(console.error);
