import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from './db/index'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'
import type { UserRole } from './src/lib/auth-utils'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/admin/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user || !user.isActive || user.deletedAt) return null

        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.userId = token.userId as string
      session.user.role = token.role as UserRole
      return session
    },
  },
})

// Module augmentation for NextAuth v5
declare module 'next-auth' {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      userId: string
      role: UserRole
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    role: UserRole
  }
}
