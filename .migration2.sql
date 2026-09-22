ALTER TABLE costeos_item
  ADD COLUMN item_registro TINYINT NOT NULL DEFAULT 0 AFTER tipo_producto,
  ADD COLUMN venta TINYINT NOT NULL DEFAULT 0 AFTER item_registro;
