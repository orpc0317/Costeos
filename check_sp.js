const sql = require('mssql');
async function main() {
  const pool = await sql.connect('Server=localhost,62475;Database=OfisG4S;User Id=sa;Password=Clave01*;Encrypt=true;TrustServerCertificate=true;');
  const result = await pool.request().input('PrmEmpresa', 3).input('PrmSearchText', '').execute('sp_buscar_servicios_venta');
  console.log(result.recordset.slice(0, 5));
  process.exit(0);
}
main().catch(console.error);
