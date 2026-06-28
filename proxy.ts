import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// "proxy" é a evolução do antigo "middleware" no Next.js 16. Roda no edge e
// usa apenas a config edge-safe (sem Prisma/bcrypt). O callback `authorized`
// protege /painel/* e redireciona não autenticados para o login.
export default NextAuth(authConfig).auth

export const config = {
  // Protege o painel da loja e o painel da plataforma.
  // O login (/painel/login) é liberado pelo callback authorized.
  matcher: ['/painel/:path*', '/admin-plataforma/:path*'],
}
