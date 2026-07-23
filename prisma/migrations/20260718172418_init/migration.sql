-- CreateTable
CREATE TABLE `t_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` VARCHAR(20) NOT NULL DEFAULT 'ANALISTA',
    `usuario_erp` VARCHAR(10) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `agrego_usuario` INTEGER NOT NULL DEFAULT 0,
    `agrego_fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modifico_usuario` INTEGER NOT NULL DEFAULT 0,
    `modifico_fecha` DATETIME(3) NOT NULL,

    UNIQUE INDEX `t_usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `erp_cliente_id` INTEGER NULL,
    `codigo_temp` VARCHAR(50) NULL,
    `nit` VARCHAR(30) NOT NULL,
    `razon_social` VARCHAR(200) NOT NULL,
    `direccion_fiscal` VARCHAR(500) NULL,
    `es_nuevo` BOOLEAN NOT NULL DEFAULT false,
    `sincronizado_en` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modificado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_contrato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cliente_id` INTEGER NOT NULL,
    `numero` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `plazo_meses` INTEGER NOT NULL,
    `moneda` VARCHAR(10) NOT NULL DEFAULT 'GTQ',
    `estado` VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    `erp_contrato_id` INTEGER NULL,
    `notas` TEXT NULL,
    `aprobado_por` INTEGER NULL,
    `aprobado_en` DATETIME(3) NULL,
    `creado_por` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modificado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_sitio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contrato_id` INTEGER NOT NULL,
    `codigo` VARCHAR(20) NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `direccion` VARCHAR(500) NULL,
    `pais` VARCHAR(100) NULL,
    `departamento` VARCHAR(100) NULL,
    `municipio` VARCHAR(100) NULL,
    `latitud` DECIMAL(10, 7) NULL,
    `longitud` DECIMAL(10, 7) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_puesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sitio_id` INTEGER NOT NULL,
    `codigo` VARCHAR(20) NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `dias_cobertura` VARCHAR(100) NOT NULL,
    `hora_inicio` VARCHAR(5) NOT NULL,
    `hora_fin` VARCHAR(5) NOT NULL,
    `turnos_horas` INTEGER NOT NULL DEFAULT 12,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_puesto_recurso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `puesto_id` INTEGER NOT NULL,
    `erp_item_id` INTEGER NOT NULL,
    `item_nombre` VARCHAR(200) NOT NULL,
    `item_tipo` VARCHAR(30) NOT NULL,
    `item_categoria` VARCHAR(100) NOT NULL,
    `item_tipo_costo` VARCHAR(10) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `costo_unitario_erp` DECIMAL(18, 4) NULL,
    `precio_venta` DECIMAL(18, 2) NULL,
    `precio_venta_origen` VARCHAR(10) NOT NULL DEFAULT 'LISTA',
    `congelado_en` DATETIME(3) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_receta_snap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `puesto_recurso_id` INTEGER NOT NULL,
    `nivel` INTEGER NOT NULL,
    `erp_item_id` INTEGER NOT NULL,
    `item_nombre` VARCHAR(200) NOT NULL,
    `item_categoria` VARCHAR(100) NOT NULL,
    `item_tipo_costo` VARCHAR(10) NOT NULL,
    `cantidad` DECIMAL(10, 4) NOT NULL,
    `costo_unitario` DECIMAL(18, 4) NOT NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `es_opcional` BOOLEAN NOT NULL DEFAULT false,
    `fue_eliminado` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_costeo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contrato_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `costeo_padre_id` INTEGER NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    `overhead_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `contingencia_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `margen_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `notas` TEXT NULL,
    `aprobado_por` INTEGER NULL,
    `aprobado_en` DATETIME(3) NULL,
    `creado_por` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modificado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `costeos_costeo_contrato_id_key`(`contrato_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_resultado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `costeo_id` INTEGER NOT NULL,
    `costo_mensual` DECIMAL(18, 2) NOT NULL,
    `costo_anual` DECIMAL(18, 2) NOT NULL,
    `costo_total_proyecto` DECIMAL(18, 2) NOT NULL,
    `venta_mensual` DECIMAL(18, 2) NOT NULL,
    `venta_anual` DECIMAL(18, 2) NOT NULL,
    `venta_total_proyecto` DECIMAL(18, 2) NOT NULL,
    `gross_margin_pct` DECIMAL(5, 2) NOT NULL,
    `roi_pct` DECIMAL(5, 2) NOT NULL,
    `calculado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `costeos_resultado_costeo_id_key`(`costeo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_resultado_categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resultado_id` INTEGER NOT NULL,
    `categoria` VARCHAR(100) NOT NULL,
    `costo_mensual` DECIMAL(18, 2) NOT NULL,
    `costo_total` DECIMAL(18, 2) NOT NULL,
    `venta_mensual` DECIMAL(18, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `costeos_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tabla` VARCHAR(100) NOT NULL,
    `registro_id` INTEGER NOT NULL,
    `accion` VARCHAR(20) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `costeo_id` INTEGER NULL,
    `datos_antes` LONGTEXT NULL,
    `datos_despues` LONGTEXT NULL,
    `en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `costeos_audit_log_tabla_registro_id_idx`(`tabla`, `registro_id`),
    INDEX `costeos_audit_log_costeo_id_idx`(`costeo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `costeos_contrato` ADD CONSTRAINT `costeos_contrato_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `costeos_cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_contrato` ADD CONSTRAINT `costeos_contrato_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `t_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_contrato` ADD CONSTRAINT `costeos_contrato_aprobado_por_fkey` FOREIGN KEY (`aprobado_por`) REFERENCES `t_usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_sitio` ADD CONSTRAINT `costeos_sitio_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `costeos_contrato`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_puesto` ADD CONSTRAINT `costeos_puesto_sitio_id_fkey` FOREIGN KEY (`sitio_id`) REFERENCES `costeos_sitio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_puesto_recurso` ADD CONSTRAINT `costeos_puesto_recurso_puesto_id_fkey` FOREIGN KEY (`puesto_id`) REFERENCES `costeos_puesto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_receta_snap` ADD CONSTRAINT `costeos_receta_snap_puesto_recurso_id_fkey` FOREIGN KEY (`puesto_recurso_id`) REFERENCES `costeos_puesto_recurso`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_costeo` ADD CONSTRAINT `costeos_costeo_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `costeos_contrato`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_costeo` ADD CONSTRAINT `costeos_costeo_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `t_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_costeo` ADD CONSTRAINT `costeos_costeo_aprobado_por_fkey` FOREIGN KEY (`aprobado_por`) REFERENCES `t_usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_costeo` ADD CONSTRAINT `costeos_costeo_costeo_padre_id_fkey` FOREIGN KEY (`costeo_padre_id`) REFERENCES `costeos_costeo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_resultado` ADD CONSTRAINT `costeos_resultado_costeo_id_fkey` FOREIGN KEY (`costeo_id`) REFERENCES `costeos_costeo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_resultado_categoria` ADD CONSTRAINT `costeos_resultado_categoria_resultado_id_fkey` FOREIGN KEY (`resultado_id`) REFERENCES `costeos_resultado`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_audit_log` ADD CONSTRAINT `costeos_audit_log_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `t_usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `costeos_audit_log` ADD CONSTRAINT `costeos_audit_log_costeo_id_fkey` FOREIGN KEY (`costeo_id`) REFERENCES `costeos_costeo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
