import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/** Registra uma ação administrativa (SUPERADMIN) na trilha de auditoria.
 *  Sem FK: o registro sobrevive à exclusão da loja/usuário-alvo. */
export function recordAdminAudit(data: {
  actorUserId: string
  action: string
  targetStoreId?: string | null
  detail?: unknown
}) {
  return prisma.adminAuditLog.create({
    data: {
      actorUserId: data.actorUserId,
      action: data.action,
      targetStoreId: data.targetStoreId ?? null,
      detail: (data.detail ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
