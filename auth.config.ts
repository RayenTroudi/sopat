import type { NextAuthConfig } from 'next-auth'

// Edge-safe auth config — no DB or bcrypt imports.
// Used by middleware only. The full authorize logic runs in auth.ts (Node.js runtime).
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  providers: [],
}
