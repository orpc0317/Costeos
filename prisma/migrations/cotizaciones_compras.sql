-- Add cotizacion_scope to Item if it doesn't exist
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'costeos_item'
  AND COLUMN_NAME = 'cotizacion_scope'
);
SET @sql = IF(@exist = 0,
  'ALTER TABLE `costeos_item` ADD COLUMN `cotizacion_scope` VARCHAR(20) NOT NULL DEFAULT ''GENERAL'' AFTER `manejo_costos`',
  'SELECT ''cotizacion_scope already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `cotizaciones_solicitud` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresa_id` INT NOT NULL DEFAULT 0,
  `item_id` INT NOT NULL,
  `costeo_id` INT NULL,
  `scope` VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
  `estado` INT NOT NULL DEFAULT 1,
  `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `creado_por` INT NOT NULL DEFAULT 0,
  `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `modificado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `registro_version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `solicitud_item_costeo_unique` (`item_id`, `costeo_id`),
  KEY `cotizaciones_solicitud_empresa_id_fkey` (`empresa_id`),
  KEY `cotizaciones_solicitud_item_id_fkey` (`item_id`),
  KEY `cotizaciones_solicitud_costeo_id_fkey` (`costeo_id`),
  CONSTRAINT `cotizaciones_solicitud_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `costeos_item` (`id`),
  CONSTRAINT `cotizaciones_solicitud_costeo_id_fkey` FOREIGN KEY (`costeo_id`) REFERENCES `costeos_costeo` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cotizaciones_cotizacion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solicitud_id` INT NOT NULL,
  `proveedor_id` INT NOT NULL,
  `referencia_cotizacion` VARCHAR(100) NULL,
  `fecha_cotizacion` DATE NOT NULL,
  `cantidad_cotizada` DECIMAL(18, 4) NOT NULL DEFAULT 0,
  `monto_total` DECIMAL(18, 4) NOT NULL DEFAULT 0,
  `costo_unitario` DECIMAL(18, 4) NOT NULL DEFAULT 0,
  `vigente` TINYINT(1) NOT NULL DEFAULT 0,
  `archivo_url` VARCHAR(500) NULL,
  `archivo_nombre` VARCHAR(200) NULL,
  `notas` TEXT NULL,
  `creado_por` INT NOT NULL DEFAULT 0,
  `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `registro_version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `cotizaciones_cotizacion_solicitud_id_fkey` (`solicitud_id`),
  KEY `cotizaciones_cotizacion_proveedor_id_fkey` (`proveedor_id`),
  CONSTRAINT `cotizaciones_cotizacion_solicitud_id_fkey` FOREIGN KEY (`solicitud_id`) REFERENCES `cotizaciones_solicitud` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizaciones_cotizacion_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `costeos_proveedor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
