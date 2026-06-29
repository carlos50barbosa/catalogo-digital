-- AlterTable
ALTER TABLE `StoreSettings` ADD COLUMN `fiadoDefaultCreditLimit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `fiadoDefaultTermDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `fiadoEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `fiadoReminderTemplate` TEXT NULL;

-- CreateTable
CREATE TABLE `FiadoAccount` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `creditLimit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FiadoAccount_customerId_key`(`customerId`),
    INDEX `FiadoAccount_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FiadoEntry` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `fiadoAccountId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `reversesEntryId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FiadoEntry_storeId_fiadoAccountId_createdAt_idx`(`storeId`, `fiadoAccountId`, `createdAt`),
    INDEX `FiadoEntry_storeId_customerId_idx`(`storeId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FiadoAccount` ADD CONSTRAINT `FiadoAccount_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiadoAccount` ADD CONSTRAINT `FiadoAccount_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiadoEntry` ADD CONSTRAINT `FiadoEntry_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiadoEntry` ADD CONSTRAINT `FiadoEntry_fiadoAccountId_fkey` FOREIGN KEY (`fiadoAccountId`) REFERENCES `FiadoAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiadoEntry` ADD CONSTRAINT `FiadoEntry_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiadoEntry` ADD CONSTRAINT `FiadoEntry_reversesEntryId_fkey` FOREIGN KEY (`reversesEntryId`) REFERENCES `FiadoEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
