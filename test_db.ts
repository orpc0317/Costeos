import { getErpDbConnection } from './src/lib/erp-db';

async function test() {
  try {
    const pool = await getErpDbConnection();
    const request = pool.request();
    request.input('PrmEmpresa', 3);
    request.input('PrmCliente', 10001);
    
    const result = await request.execute('sp_buscar_cliente_direccion');
    console.log("Direcciones:", result.recordset);
    
    // Also fetch municipios for dept 1
    const mReq = pool.request();
    mReq.input('PrmPais', 'GT');
    mReq.input('PrmDepartamento', 1);
    const mRes = await mReq.execute('sp_municipios_departamento');
    console.log("Municipios de depto 1:", mRes.recordset.slice(0, 5));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
test();
