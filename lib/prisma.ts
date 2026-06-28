import { PrismaClient } from '@prisma/client'

// Singleton do Prisma Client. Evita esgotar conexões em dev (hot reload)
// reaproveitando a mesma instância no escopo global.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
