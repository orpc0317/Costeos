import { getErpDbConnection } from './src/lib/erp-db';

async function run() {
  const pool = await getErpDbConnection();
  const result = await pool.request().query(`
    SELECT 
        p.name AS ProcedureName, 
        param.name AS ParameterName, 
        type_name(param.user_type_id) AS TypeName
    FROM sys.procedures p
    JOIN sys.parameters param ON p.object_id = param.object_id
    WHERE p.name LIKE '%municipio%' OR p.name LIKE '%muni%'
  `);
  console.log(result.recordset);
  process.exit(0);
}

run().catch(console.error);
