-- AlterTable
ALTER TABLE `Product` ADD COLUMN `barcode` VARCHAR(191) NULL,
    ADD COLUMN `cost` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `NfeImport` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `accessKey` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NULL,
    `supplierCnpj` VARCHAR(191) NULL,
    `itemCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NfeImport_storeId_idx`(`storeId`),
    UNIQUE INDEX `NfeImport_storeId_accessKey_key`(`storeId`, `accessKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_storeId_barcode_idx` ON `Product`(`storeId`, `barcode`);

-- AddForeignKey
ALTER TABLE `NfeImport` ADD CONSTRAINT `NfeImport_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
