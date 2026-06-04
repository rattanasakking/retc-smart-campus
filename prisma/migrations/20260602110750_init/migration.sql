-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'executive', 'teacher', 'staff') NOT NULL DEFAULT 'staff',
    `department` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_employeeId_key`(`employeeId`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duty_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `dutyDate` DATE NOT NULL,
    `shiftType` ENUM('morning', 'afternoon', 'evening', 'holiday') NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `maxTeachers` INTEGER NOT NULL DEFAULT 2,
    `note` TEXT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duty_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scheduleId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `status` ENUM('assigned', 'completed', 'absent', 'late') NOT NULL DEFAULT 'assigned',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duty_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignmentId` INTEGER NOT NULL,
    `checkinTime` DATETIME(3) NULL,
    `checkoutTime` DATETIME(3) NULL,
    `note` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duty_swaps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requesterId` INTEGER NOT NULL,
    `targetId` INTEGER NOT NULL,
    `scheduleId` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('pending', 'accepted', 'rejected', 'approved') NOT NULL DEFAULT 'pending',
    `approvedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `work_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `workTypeId` INTEGER NOT NULL,
    `logDate` DATE NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `detail` TEXT NOT NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `attachments` TEXT NULL,
    `status` ENUM('draft', 'submitted', 'approved', 'rejected', 'returned') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_log_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `logId` INTEGER NOT NULL,
    `approverId` INTEGER NOT NULL,
    `status` ENUM('approved', 'rejected', 'returned') NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `equipment_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `department` VARCHAR(191) NOT NULL,
    `room` VARCHAR(191) NULL,
    `price` DECIMAL(12, 2) NULL,
    `acquiredDate` DATE NULL,
    `source` VARCHAR(191) NULL,
    `status` ENUM('active', 'damaged', 'disposed', 'borrowed') NOT NULL DEFAULT 'active',
    `qrCode` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `equipments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_borrows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `borrowerId` INTEGER NOT NULL,
    `approverId` INTEGER NULL,
    `purpose` TEXT NOT NULL,
    `borrowDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `returnDate` DATE NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'returned', 'overdue') NOT NULL DEFAULT 'pending',
    `condition` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_inspections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `inspectorId` INTEGER NOT NULL,
    `inspectDate` DATE NOT NULL,
    `condition` ENUM('good', 'fair', 'damaged', 'disposed') NOT NULL,
    `note` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketNo` VARCHAR(191) NOT NULL,
    `reporterId` INTEGER NOT NULL,
    `equipmentId` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `urgency` ENUM('normal', 'urgent', 'critical') NOT NULL DEFAULT 'normal',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `status` ENUM('pending', 'assigned', 'in_progress', 'waiting_parts', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `repair_tickets_ticketNo_key`(`ticketNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `technicianId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `solution` TEXT NULL,
    `cost` DECIMAL(12, 2) NULL DEFAULT 0,
    `status` ENUM('assigned', 'in_progress', 'completed') NOT NULL DEFAULT 'assigned',
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `pmType` VARCHAR(191) NOT NULL,
    `scheduledDate` DATE NOT NULL,
    `technicianId` INTEGER NULL,
    `status` ENUM('scheduled', 'completed', 'overdue', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `note` TEXT NULL,
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `facilities` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `requireApproval` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('active', 'maintenance', 'inactive') NOT NULL DEFAULT 'active',
    `note` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `attendees` INTEGER NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `equipmentNeeded` TEXT NULL,
    `purpose` TEXT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_booking_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `approverId` INTEGER NOT NULL,
    `status` ENUM('approved', 'rejected') NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `link` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `duty_schedules` ADD CONSTRAINT `duty_schedules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_assignments` ADD CONSTRAINT `duty_assignments_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `duty_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_assignments` ADD CONSTRAINT `duty_assignments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_logs` ADD CONSTRAINT `duty_logs_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `duty_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_swaps` ADD CONSTRAINT `duty_swaps_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_swaps` ADD CONSTRAINT `duty_swaps_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_swaps` ADD CONSTRAINT `duty_swaps_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `duty_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duty_swaps` ADD CONSTRAINT `duty_swaps_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_logs` ADD CONSTRAINT `work_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_logs` ADD CONSTRAINT `work_logs_workTypeId_fkey` FOREIGN KEY (`workTypeId`) REFERENCES `work_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_log_approvals` ADD CONSTRAINT `work_log_approvals_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `work_logs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_log_approvals` ADD CONSTRAINT `work_log_approvals_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipments` ADD CONSTRAINT `equipments_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `equipment_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_borrows` ADD CONSTRAINT `equipment_borrows_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `equipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_borrows` ADD CONSTRAINT `equipment_borrows_borrowerId_fkey` FOREIGN KEY (`borrowerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_borrows` ADD CONSTRAINT `equipment_borrows_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_inspections` ADD CONSTRAINT `equipment_inspections_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `equipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_inspections` ADD CONSTRAINT `equipment_inspections_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tickets` ADD CONSTRAINT `repair_tickets_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tickets` ADD CONSTRAINT `repair_tickets_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `equipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_assignments` ADD CONSTRAINT `repair_assignments_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `repair_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_assignments` ADD CONSTRAINT `repair_assignments_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `equipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_booking_approvals` ADD CONSTRAINT `room_booking_approvals_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `room_bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_booking_approvals` ADD CONSTRAINT `room_booking_approvals_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
