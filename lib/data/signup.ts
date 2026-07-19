import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { StoreSegment } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

// Camada de dados do cadastro self-service.

/** Gera um slug único a partir do nome (sufixo numérico em caso de colisão). */
export async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'loja'
  let slug = root
  let n = 1
  // limite de segurança
  while (n < 1000 && (await prisma.store.findUnique({ where: { slug }, select: { id: true } }))) {
    n++
    slug = `${root}-${n}`
  }
  return slug
}

export async function slugAvailable(slug: string): Promise<boolean> {
  const s = slugify(slug)
  if (!s) return false
  const existing = await prisma.store.findUnique({ where: { slug: s }, select: { id: true } })
  return !existing
}

export async function emailTaken(email: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } })
  return !!u
}

/** Cria Store (PENDING, não publicada) + User OWNER (não verificado) + StoreSettings. */
export async function createSelfServiceStore(input: {
  ownerName: string
  storeName: string
  whatsapp: string
  email: string
  password: string
  slug: string
  segment: StoreSegment
}): Promise<{ storeId: string; token: string }> {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const store = await prisma.store.create({
    data: {
      slug: input.slug,
      name: input.storeName,
      segment: input.segment,
      whatsappNumber: input.whatsapp,
      status: 'PENDING', // self-service nasce pendente; vira público após pagamento + publicar
      published: false,
      isActive: true,
      settings: { create: {} },
      users: {
        create: {
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.ownerName,
          role: 'OWNER',
          emailVerifyToken: token,
          emailVerifyExpires: expires,
        },
      },
    },
  })
  return { storeId: store.id, token }
}

/** Valida o token de verificação e marca o e-mail como verificado. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token) return false
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
  if (!user || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) return false
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), emailVerifyToken: null, emailVerifyExpires: null },
  })
  return true
}

/** Gera um novo token de verificação (reenvio). Retorna o token ou null. */
export async function regenerateVerifyToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || user.emailVerified) return null
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  })
  return token
}
