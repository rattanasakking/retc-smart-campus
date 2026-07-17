-- Room manager + booking table-layout

ALTER TABLE `rooms` ADD COLUMN `managerId` INTEGER NULL;
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_managerId_fkey`
  FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `room_bookings` ADD COLUMN `tableLayout` VARCHAR(191) NULL;
