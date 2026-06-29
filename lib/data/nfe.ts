import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Repositório de NfeImport — log/auditoria e guarda de deduplicação das
 * importações por NF-e. Sempre escopado por storeId (a chave de acesso é
 * única por loja: a mesma nota não entra duas vezes).
 */

/** Já existe uma importação desta nota (chave de acesso) nesta loja? */
export function findNfeImport(storeId: string, accessKey: string) {
  return prisma.nfeImport.findUnique({
    where: { storeId_accessKey: { storeId, accessKey } },
  })
}

/** Registra a importação. Aceita um client de transação (tx) opcional. */
export function recordNfeImport(
  client: Prisma.TransactionClient | typeof prisma,
  data: {
    storeId: string
    accessKey: string
    supplierName: string | null
    supplierCnpj: string | null
    itemCount: number
  },
) {
  return client.nfeImport.create({ data })
}
