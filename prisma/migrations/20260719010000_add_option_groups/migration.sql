-- Complementos / adicionais (lanchonete). Puramente aditivo: nenhuma loja
-- existente muda de comportamento e nenhum pedido antigo precisa de backfill.
-- Nomes de tabela em PascalCase: o MariaDB de produção é case-sensitive.

CREATE TABLE `OptionGroup` (
  `id` VARCHAR(191) NOT NULL,
  `storeId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `minSelect` INTEGER NOT NULL DEFAULT 0,
  `maxSelect` INTEGER NOT NULL DEFAULT 1,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `OptionGroup_storeId_idx`(`storeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Option` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `priceDelta` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `defaultSelected` BOOLEAN NOT NULL DEFAULT false,
  `isAvailable` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Option_groupId_idx`(`groupId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductOptionGroup` (
  `productId` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  INDEX `ProductOptionGroup_groupId_idx`(`groupId`),
  PRIMARY KEY (`productId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderItem` ADD COLUMN `options` JSON NULL;
ALTER TABLE `OrderItem` ADD COLUMN `notes` TEXT NULL;

ALTER TABLE `OptionGroup` ADD CONSTRAINT `OptionGroup_storeId_fkey`
  FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Option` ADD CONSTRAINT `Option_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `OptionGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductOptionGroup` ADD CONSTRAINT `ProductOptionGroup_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductOptionGroup` ADD CONSTRAINT `ProductOptionGroup_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `OptionGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
