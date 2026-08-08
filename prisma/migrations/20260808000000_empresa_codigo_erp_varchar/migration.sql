-- Compatibilidad con shadow database: crea la tabla si aún no existe.
-- En la base real ya existe; el CREATE IF NOT EXISTS es inocuo.
CREATE TABLE IF NOT EXISTS `costeos_empresa` (
    `id`               INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_nombre`   VARCHAR(100) NOT NULL,
    `codigo_erp`       INTEGER NOT NULL DEFAULT 0,
    `usuario_creo`     INTEGER NOT NULL DEFAULT 0,
    `fecha_creo`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registro_version` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cambia codigo_erp de INT a VARCHAR(10)
ALTER TABLE `costeos_empresa`
  MODIFY COLUMN `codigo_erp` VARCHAR(10) NOT NULL DEFAULT '';
