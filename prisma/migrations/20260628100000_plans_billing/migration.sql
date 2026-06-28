-- AlterTable
ALTER TABLE `Store` ADD COLUMN `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('OWNER', 'STAFF', 'SUPERADMIN') NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `gateway` VARCHAR(191) NOT NULL DEFAULT 'asaas',
    `gatewayCustomerId` VARCHAR(191) NULL,
    `gatewaySubscriptionId` VARCHAR(191) NULL,
    `plan` ENUM('ESSENCIAL', 'PROFISSIONAL', 'PREMIUM') NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `billingType` ENUM('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED') NOT NULL DEFAULT 'UNDEFINED',
    `value` DECIMAL(10, 2) NOT NULL,
    `cycle` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `nextDueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_storeId_key`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NULL,
    `gatewayEventId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BillingEvent_gatewayEventId_key`(`gatewayEventId`),
    INDEX `BillingEvent_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingEvent` ADD CONSTRAINT `BillingEvent_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

