-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `cpfCnpj` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Subscription_cpfCnpj_idx` ON `Subscription`(`cpfCnpj`);
