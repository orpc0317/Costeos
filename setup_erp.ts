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
    
    const script = `
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'erp')
BEGIN
    EXEC('CREATE SCHEMA erp');
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_item' AND schema_id = SCHEMA_ID('erp'))
BEGIN
    CREATE TABLE erp.categorias_item (
        id INT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'items' AND schema_id = SCHEMA_ID('erp'))
BEGIN
    CREATE TABLE erp.items (
        id INT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255),
        tipo VARCHAR(50) NOT NULL,
        tipo_costo VARCHAR(50) NOT NULL,
        unidad VARCHAR(20) NOT NULL,
        costo_unitario DECIMAL(18,2) NOT NULL,
        tiene_receta BIT NOT NULL DEFAULT 0,
        categoria_id INT NULL,
        activo BIT NOT NULL DEFAULT 1
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lista_precios' AND schema_id = SCHEMA_ID('erp'))
BEGIN
    CREATE TABLE erp.lista_precios (
        item_id INT PRIMARY KEY,
        precio_venta DECIMAL(18,2) NOT NULL,
        activo BIT NOT NULL DEFAULT 1
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'recetas' AND schema_id = SCHEMA_ID('erp'))
BEGIN
    CREATE TABLE erp.recetas (
        item_padre_id INT NOT NULL,
        item_componente_id INT NOT NULL,
        cantidad DECIMAL(18,2) NOT NULL,
        es_opcional BIT NOT NULL DEFAULT 0,
        orden INT NOT NULL,
        PRIMARY KEY (item_padre_id, item_componente_id)
    );
END

-- Insert some mock data
IF NOT EXISTS (SELECT * FROM erp.categorias_item WHERE id = 1)
BEGIN
    INSERT INTO erp.categorias_item VALUES (1, 'Servicios de Seguridad');
    INSERT INTO erp.categorias_item VALUES (2, 'Equipamiento');
    INSERT INTO erp.items VALUES (1, 'S-001', 'Guardia de Seguridad', 'Guardia 24/7', 'SERVICIO', 'MENSUAL', 'Mes', 5000.00, 0, 1, 1);
    INSERT INTO erp.items VALUES (2, 'E-001', 'Cámara CCTV', 'Cámara Domo', 'EQUIPO', 'UNICO', 'Unidad', 1500.00, 0, 2, 1);
    INSERT INTO erp.lista_precios VALUES (1, 6500.00, 1);
    INSERT INTO erp.lista_precios VALUES (2, 2000.00, 1);
END
    `;
    
    // We can't execute multiple batches with CREATE SCHEMA easily in mssql without splitting by GO, 
    // so we wrap them in EXEC if needed. The above script handles this.
    
    await pool.request().batch(script);
    console.log("Mock ERP tables created successfully.");

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
