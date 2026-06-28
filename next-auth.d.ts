import type { DefaultSession } from 'next-auth'
import type { Role } from '@/lib/types'

// Aumenta os tipos do Auth.js para carregar storeId/role/slug na sessão e no JWT.
declare module 'next-auth' {
  interface User {
    storeId: string
    role: Role
    storeSlug: string
  }

  interface Session {
    user: {
      id: string
      storeId: string
      role: Role
      storeSlug: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    storeId: string
    role: Role
    storeSlug: string
  }
}
