-- AlterTable: add structured Thai address fields to users
ALTER TABLE `users`
  ADD COLUMN `addressProvince`    VARCHAR(191) NULL,
  ADD COLUMN `addressDistrict`    VARCHAR(191) NULL,
  ADD COLUMN `addressSubdistrict` VARCHAR(191) NULL,
  ADD COLUMN `addressPostalCode`  VARCHAR(191) NULL;
