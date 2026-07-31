import fs from 'fs';
import sql from 'mssql';

async function run() {
  try {
    const env = fs.readFileSync('C:/Proyectos/Costeos/.env', 'utf8');
    let user = '', password = '', server = '', port = '', db = '';
    
    for (const line of env.split('\n')) {
      if (line.startsWith('ERP_DB_USER=')) user = line.split('=')[1].replace(/"/g, '').trim();
      if (line.startsWith('ERP_DB_PASSWORD=')) password = line.split('=')[1].replace(/"/g, '').trim();
      if (line.startsWith('ERP_DB_SERVER=')) server = line.split('=')[1].replace(/"/g, '').trim();
      if (line.startsWith('ERP_DB_PORT=')) port = line.split('=')[1].replace(/"/g, '').trim();
      if (line.startsWith('ERP_DB_NAME=')) db = line.split('=')[1].replace(/"/g, '').trim();
    }
    
    const pool = await sql.connect({
      user, password, server, port: parseInt(port), database: db,
      options: { trustServerCertificate: true }
    });
    
    const result1 = await pool.request().query("SELECT name FROM sys.procedures WHERE name LIKE '%item%' OR name LIKE '%servicio%' OR name LIKE '%receta%' OR name LIKE '%producto%' OR name LIKE '%catalogo%'");
    console.log("Procedures:", result1.recordset);
    
    const result2 = await pool.request().query("SELECT name, schema_id FROM sys.tables WHERE name LIKE '%item%' OR name LIKE '%servicio%' OR name LIKE '%receta%' OR name LIKE '%producto%' OR name LIKE '%catalogo%'");
    console.log("Tables:", result2.recordset);
    
    const schemas = await pool.request().query("SELECT name, schema_id FROM sys.schemas WHERE name = 'erp'");
    console.log("Schemas:", schemas.recordset);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
