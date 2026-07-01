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
          passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : null,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Sobrescreve o jwt edge para, no runtime Node, REVOGAR a sessão quando a
    // senha foi trocada depois da emissão do token (defesa pós "recuperar senha").
    async jwt({ token, user }) {
      if (user) {
        // Login: copia claims + pwc (mesma lógica do edge).
        token.storeId = user.storeId
        token.role = user.role
        token.storeSlug = user.storeSlug
        token.pwc = user.passwordChangedAt
        return token
      }
      if (token.sub) {
        const u = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true },
        })
        const changed = u?.passwordChangedAt ? u.passwordChangedAt.getTime() : null
        const tokenPwc = typeof token.pwc === 'number' ? token.pwc : null
        if (changed && (tokenPwc == null || changed > tokenPwc)) {
          return null // token emitido antes da troca de senha => sessão revogada
        }
      }
      return token
    },
  },
})
