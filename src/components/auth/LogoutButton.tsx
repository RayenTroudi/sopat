'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export default function LogoutButton({ className, style, children }: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
      style={style}
    >
      {loading ? 'Déconnexion…' : (children ?? 'Déconnexion')}
    </button>
  )
}
