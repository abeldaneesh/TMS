-- AlterTable
ALTER TABLE `nomination` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(191) NULL;
