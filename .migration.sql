ALTER TABLE costeos_item 
  RENAME COLUMN tipo_servicio TO tipo_producto;

ALTER TABLE costeos_item 
  ADD COLUMN item_registro TINYINT NOT NULL DEFAULT 0 AFTER tipo_producto,
  ADD COLUMN venta TINYINT NOT NULL DEFAULT 0 AFTER item_registro;

-- Migración: items tipoItem=2 que tenían tipoServicio=1 (Personal) → itemRegistro=1 (Outsourcing)
UPDATE costeos_item 
SET tipo_producto = 0, item_registro = 1
WHERE tipo_item = 2 AND tipo_producto = 1;
