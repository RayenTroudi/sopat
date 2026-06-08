'use client'

import { useState, useEffect } from 'react'
import type { UserRole } from '@/lib/auth-utils'

export interface ClientSession {
  userId: string
  email: string
  name: string
  role: UserRole
}

export interface UseSessionResult {
  session: ClientSession | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false))
  }, [])

  return { session, isLoading, isAuthenticated: session !== null }
}
