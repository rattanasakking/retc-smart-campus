-- Telegram linking
ALTER TABLE `users` ADD COLUMN `telegramChatId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `users_telegramChatId_key` ON `users`(`telegramChatId`);
