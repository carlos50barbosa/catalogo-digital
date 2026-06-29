-- AlterTable
ALTER TABLE `User` ADD COLUMN `passwordResetExpires` DATETIME(3) NULL,
    ADD COLUMN `passwordResetToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_passwordResetToken_key` ON `User`(`passwordResetToken`);

