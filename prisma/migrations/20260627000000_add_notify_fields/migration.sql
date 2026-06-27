-- AlterTable: add notification preference fields to users
ALTER TABLE `users`
  ADD COLUMN `notifyByLine`  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyByEmail` BOOLEAN NOT NULL DEFAULT false;
