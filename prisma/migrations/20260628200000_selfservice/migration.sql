-- AlterTable
ALTER TABLE `Store` ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `status` ENUM('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `emailVerified` DATETIME(3) NULL,
    ADD COLUMN `emailVerifyExpires` DATETIME(3) NULL,
    ADD COLUMN `emailVerifyToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_emailVerifyToken_key` ON `User`(`emailVerifyToken`);

