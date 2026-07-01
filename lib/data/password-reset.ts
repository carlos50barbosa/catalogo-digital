import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Recuperação de senha por token (expira em 1 hora).

export async function createPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return null
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) },
  })
  return token
}

export async function isValidResetToken(token: string): Promise<boolean> {
  if (!token) return false
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { passwordResetExpires: true },
  })
  return !!(user?.passwordResetExpires && user.passwordResetExpires > new Date())
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  if (!token) return false
  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) return false
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    // passwordChangedAt revoga tokens JWT emitidos antes desta troca.
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordChangedAt: new Date(),
    },
  })
  return true
}
