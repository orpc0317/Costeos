-- Paso 1: Agregar columna tipo_combo_id a costeos_item (nullable, FK a costeos_tipo_combo)
ALTER TABLE costeos_item
  ADD COLUMN tipo_combo_id INT NULL,
  ADD CONSTRAINT fk_item_tipo_combo
    FOREIGN KEY (tipo_combo_id) REFERENCES costeos_tipo_combo(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Paso 2: Crear tabla pivote costeos_item_tipo_combo
CREATE TABLE costeos_item_tipo_combo (
  item_id       INT NOT NULL,
  tipo_combo_id INT NOT NULL,
  obligatorio   TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, tipo_combo_id),
  CONSTRAINT fk_itc_item  FOREIGN KEY (item_id)       REFERENCES costeos_item(id)       ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_itc_combo FOREIGN KEY (tipo_combo_id) REFERENCES costeos_tipo_combo(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
