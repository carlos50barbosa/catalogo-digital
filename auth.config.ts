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
  // Janela de sessão de 7 dias (era o default de 30) — reduz a exposição de um
  // token vazado. A revogação por troca de senha é feita no jwt de auth.ts.
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/painel/login',
  },
  callbacks: {
    // Usado pelo middleware para proteger /painel/* (exceto o login).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isPanel = pathname.startsWith('/painel')
      const isPlatform = pathname.startsWith('/admin-plataforma')
      // Rotas do painel que são PÚBLICAS (login e recuperação de senha).
      const isPublicPanel =
        pathname === '/painel/login' ||
        pathname.startsWith('/painel/recuperar-senha') ||
        pathname.startsWith('/painel/redefinir-senha')
      // Painel da plataforma: exige login (o papel SUPERADMIN é checado no layout).
      if (isPlatform) return !!auth?.user
      if (isPanel && !isPublicPanel) {
        return !!auth?.user // não autenticado => redireciona para signIn
      }
      return true
    },
    jwt({ token, user }) {
      // No login, copia storeId/role/slug + pwc do usuário para o token.
      // (Edge-safe: sem Prisma. A checagem de revogação vive no jwt de auth.ts.)
      if (user) {
        token.storeId = user.storeId
        token.role = user.role
        token.storeSlug = user.storeSlug
        token.pwc = user.passwordChangedAt
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
