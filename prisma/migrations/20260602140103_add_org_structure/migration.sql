/*
  Warnings:

  - A unique constraint covering the columns `[nationalId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lineUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `birthDate` DATE NULL,
    ADD COLUMN `departmentId` INTEGER NULL,
    ADD COLUMN `divisionId` INTEGER NULL,
    ADD COLUMN `googleId` VARCHAR(191) NULL,
    ADD COLUMN `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lineUserId` VARCHAR(191) NULL,
    ADD COLUMN `nationalId` VARCHAR(191) NULL,
    ADD COLUMN `nickname` VARCHAR(191) NULL,
    ADD COLUMN `position` ENUM('director', 'deputy_director', 'division_chief', 'work_unit_chief', 'department_chief', 'teacher', 'specialist', 'officer', 'worker') NULL,
    ADD COLUMN `signature` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATE NULL,
    ADD COLUMN `workUnitId` INTEGER NULL;

-- CreateTable
CREATE TABLE `divisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `divisions_name_key`(`name`),
    UNIQUE INDEX `divisions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `divisionId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `work_units_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `departments_name_key`(`name`),
    UNIQUE INDEX `departments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lostfound_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `lostfound_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lostfound_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `categoryId` INTEGER NULL,
    `foundDate` DATE NULL,
    `foundLocation` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `status` ENUM('found', 'claimed', 'archived') NOT NULL DEFAULT 'found',
    `reporterId` INTEGER NOT NULL,
    `claimedBy` INTEGER NULL,
    `claimedAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `group` VARCHAR(191) NOT NULL DEFAULT 'general',
    `label` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `academic_years_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_nationalId_key` ON `users`(`nationalId`);

-- CreateIndex
CREATE UNIQUE INDEX `users_lineUserId_key` ON `users`(`lineUserId`);

-- CreateIndex
CREATE UNIQUE INDEX `users_googleId_key` ON `users`(`googleId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `divisions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_workUnitId_fkey` FOREIGN KEY (`workUnitId`) REFERENCES `work_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_units` ADD CONSTRAINT `work_units_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lostfound_items` ADD CONSTRAINT `lostfound_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `lostfound_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lostfound_items` ADD CONSTRAINT `lostfound_items_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lostfound_items` ADD CONSTRAINT `lostfound_items_claimedBy_fkey` FOREIGN KEY (`claimedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
