-- MIGRACIÓN: Nueva taxonomía tipo_item (1-6) + tipo_producto contextual + DROP item_registro
-- Ejecutar en este orden exacto para evitar colisiones

-- PASO 1: Renumerar hacia arriba primero (de mayor a menor para no pisar valores)
UPDATE costeos_item SET tipo_item = 6 WHERE tipo_item = 5;  -- Bono: 5→6
UPDATE costeos_item SET tipo_item = 5 WHERE tipo_item = 4;  -- Financiero: 4→5
UPDATE costeos_item SET tipo_item = 4 WHERE tipo_item = 3;  -- Equipo: 3→4
UPDATE costeos_item SET tipo_item = 3 WHERE tipo_item = 2;  -- Servicio: 2→3

-- PASO 2: tipo_item=1+tipo_producto=1 (viejo Genérico) → nuevo tipo_item=2 (Producto Genérico)
-- (tipo_item=2 ya está libre porque lo movimos a 3 en el paso anterior)
UPDATE costeos_item SET tipo_item = 2 WHERE tipo_item = 1 AND tipo_producto = 1;

-- PASO 3: Ajustar tipo_producto de Servicios según item_registro
-- item_registro=1 (Outsourcing) → tipo_producto=1; item_registro=0 → tipo_producto=0
UPDATE costeos_item SET tipo_producto = 1 WHERE tipo_item = 3 AND item_registro = 1;
UPDATE costeos_item SET tipo_producto = 0 WHERE tipo_item = 3 AND item_registro = 0;

-- PASO 4: Forzar tipo_producto para tipos con valor fijo
UPDATE costeos_item SET tipo_producto = 0 WHERE tipo_item = 1;   -- Producto → siempre 0
UPDATE costeos_item SET tipo_producto = 1 WHERE tipo_item = 2;   -- Producto Genérico → siempre 1
UPDATE costeos_item SET tipo_producto = 1 WHERE tipo_item = 4;   -- Equipo → siempre 1 (Activo)
UPDATE costeos_item SET tipo_producto = 0 WHERE tipo_item = 5;   -- Financiero → siempre 0
UPDATE costeos_item SET tipo_producto = 0 WHERE tipo_item = 6;   -- Bono → siempre 0

-- PASO 5: Eliminar columna item_registro
ALTER TABLE costeos_item DROP COLUMN item_registro;
