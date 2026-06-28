import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@/lib/types'

/**
 * Configuração "edge-safe" do Auth.js — SEM Prisma/bcrypt.
 * É a base usada pelo middleware (que roda no edge). O provider Credentials
 * (que precisa do banco) é adicionado só em auth.ts (runtime Node).
 */
export const authConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/painel/login',
  },
  callbacks: {
    // Usado pelo middleware para proteger /painel/* (exceto o login).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isPanel = pathname.startsWith('/painel')
      const isLogin = pathname === '/painel/login'
      if (isPanel && !isLogin) {
        return !!auth?.user // não autenticado => redireciona para signIn
      }
      return true
    },
    jwt({ token, user }) {
      // No login, copia storeId/role/slug do usuário para o token.
      if (user) {
        token.storeId = user.storeId
        token.role = user.role
        token.storeSlug = user.storeSlug
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.storeId = token.storeId as string
        session.user.role = token.role as Role
        session.user.storeSlug = token.storeSlug as string
      }
      return session
    },
  },
  providers: [], // preenchido em auth.ts
} satisfies NextAuthConfig
