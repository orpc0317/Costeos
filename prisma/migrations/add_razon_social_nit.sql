ALTER TABLE `costeos_empresa`
  ADD COLUMN `empresa_razon_social` VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN `empresa_nit` VARCHAR(20) NOT NULL DEFAULT '';
