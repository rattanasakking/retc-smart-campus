-- Certificate module tables

CREATE TABLE `cert_projects` (
  `id`           INTEGER NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(191) NOT NULL,
  `templateUrl`  TEXT NOT NULL,
  `textSettings` TEXT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cert_series` (
  `id`            INTEGER NOT NULL AUTO_INCREMENT,
  `projectId`     INTEGER NULL,
  `prefix`        VARCHAR(191) NOT NULL,
  `year`          VARCHAR(191) NULL,
  `startNum`      INTEGER NOT NULL DEFAULT 1,
  `quantity`      INTEGER NOT NULL DEFAULT 100,
  `lastNum`       INTEGER NOT NULL DEFAULT 0,
  `reqFirstname`  VARCHAR(191) NULL,
  `reqLastname`   VARCHAR(191) NULL,
  `reqDepartment` VARCHAR(191) NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `certs` (
  `id`         INTEGER NOT NULL AUTO_INCREMENT,
  `projectId`  INTEGER NOT NULL,
  `seriesId`   INTEGER NULL,
  `certNo`     VARCHAR(191) NOT NULL,
  `firstname`  VARCHAR(191) NOT NULL DEFAULT '-',
  `lastname`   VARCHAR(191) NOT NULL DEFAULT '-',
  `idCard`     VARCHAR(191) NULL,
  `position`   VARCHAR(191) NULL,
  `award`      VARCHAR(191) NULL,
  `issueDate`  DATE NOT NULL,
  `issuedById` INTEGER NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `certs_projectId_idx` (`projectId`),
  INDEX `certs_certNo_idx` (`certNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cert_project_access` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `userId`    INTEGER NOT NULL,
  `projectId` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `cert_project_access_userId_projectId_key` (`userId`, `projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cert_series`
  ADD CONSTRAINT `cert_series_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `cert_projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `certs`
  ADD CONSTRAINT `certs_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `cert_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `certs`
  ADD CONSTRAINT `certs_seriesId_fkey`
  FOREIGN KEY (`seriesId`) REFERENCES `cert_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `certs`
  ADD CONSTRAINT `certs_issuedById_fkey`
  FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cert_project_access`
  ADD CONSTRAINT `cert_project_access_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cert_project_access`
  ADD CONSTRAINT `cert_project_access_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `cert_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
