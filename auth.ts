import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'
import { loginSchema } from '@/lib/validation'

/**
 * Configuração completa do Auth.js (runtime Node). Adiciona o provider
 * Credentials, que consulta o banco e compara a senha com bcrypt.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({
          where: { email },
          include: { store: true },
        })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        // Loja desativada não pode logar.
        if (!user.store.isActive) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          storeId: user.storeId,
          role: user.role,
          storeSlug: user.store.slug,
        }
      },
    }),
  ],
})
