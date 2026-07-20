-- Largura do papel da impressora térmica (mm). Aditivo com default: nenhuma
-- loja existente muda de comportamento. PascalCase (MariaDB case-sensitive).
ALTER TABLE `StoreSettings` ADD COLUMN `receiptWidth` INTEGER NOT NULL DEFAULT 80;
