-- AlterTable: add level column to module_permissions
ALTER TABLE `module_permissions` ADD COLUMN `level` VARCHAR(191) NOT NULL DEFAULT 'ADMIN';
