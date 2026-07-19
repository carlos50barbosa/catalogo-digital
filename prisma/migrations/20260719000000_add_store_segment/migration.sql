-- Ramo da loja (mercadinho, lanchonete). Toda loja existente é MERCADO.
-- Nome da tabela em PascalCase de propósito: o MariaDB de produção é
-- case-sensitive e não reconhece `store`.
ALTER TABLE `Store` ADD COLUMN `segment` ENUM('MERCADO', 'LANCHONETE') NOT NULL DEFAULT 'MERCADO';
