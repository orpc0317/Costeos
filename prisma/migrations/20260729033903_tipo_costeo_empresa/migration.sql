/*
  Warnings:

  - You are about to drop the column `turnos_horas` on the `costeos_puesto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `costeos_contrato` ADD COLUMN `empresa_id` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `costeos_costeo` ADD COLUMN `tipo_costeo_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `costeos_puesto` DROP COLUMN `turnos_horas`,
    ADD COLUMN `cubre_descanso` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `horas_semana` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `personas` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `turno_codigo` INTEGER NULL,
    ADD COLUMN `uniforme_codigo` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `t_usuario` ADD COLUMN `registro_version` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `costeos_tipo_costeo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL DEFAULT 1,
    `codigo` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `nivel1_activo` BOOLEAN NOT NULL DEFAULT true,
    `nivel1_etiqueta` VARCHAR(50) NULL,
    `nivel1_con_direccion` BOOLEAN NOT NULL DEFAULT false,
    `nivel2_activo` BOOLEAN NOT NULL DEFAULT true,
    `nivel2_etiqueta` VARCHAR(50) NULL,
    `recursos_etiqueta` VARCHAR(50) NOT NULL DEFAULT 'Item',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modificado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `costeos_tipo_costeo_empresa_id_codigo_key`(`empresa_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `costeos_costeo` ADD CONSTRAINT `costeos_costeo_tipo_costeo_id_fkey` FOREIGN KEY (`tipo_costeo_id`) REFERENCES `costeos_tipo_costeo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
