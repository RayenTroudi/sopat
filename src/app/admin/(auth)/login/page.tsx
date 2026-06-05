'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// Inner component that reads searchParams — must be inside <Suspense>
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs text-charcoal/50 font-sans uppercase tracking-wider mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="admin@sopat.tn"
          className="w-full bg-white border border-mist rounded-lg px-4 py-3 text-charcoal font-sans text-sm placeholder-charcoal/25 focus:outline-none focus:border-green/40 focus:ring-2 focus:ring-green/10 transition"
        />
      </div>

      <div>
        <label className="block text-xs text-charcoal/50 font-sans uppercase tracking-wider mb-2">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full bg-white border border-mist rounded-lg px-4 py-3 text-charcoal font-sans text-sm placeholder-charcoal/25 focus:outline-none focus:border-green/40 focus:ring-2 focus:ring-green/10 transition"
        />
      </div>

      {error && (
        <p className="text-red-500 text-xs font-sans" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green text-ivory font-sans text-sm font-medium py-3 rounded-lg hover:bg-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Left panel — green brand strip */}
      <div className="hidden lg:flex w-1/2 bg-green flex-col justify-between p-12">
        <div>
          <Image
            src="/logo-768x519.svg"
            alt="SOPAT"
            width={140}
            height={95}
            priority
            loading="eager"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div>
          <p className="font-display text-4xl text-ivory font-light leading-snug">
            Gestion financière<br />des projets paysagers
          </p>
          <div className="mt-6 w-10 h-px bg-gold" />
        </div>
        <p className="text-white/25 text-xs font-sans">SOPAT Admin v2.0</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xs">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Image src="/logo-768x519.svg" alt="SOPAT" width={120} height={81} priority />
          </div>

          <p className="text-xs text-charcoal/40 font-sans uppercase tracking-widest mb-8">
            Espace administration
          </p>

          <Suspense fallback={
            <div className="space-y-5">
              <div className="h-12 rounded-lg animate-pulse bg-mist" />
              <div className="h-12 rounded-lg animate-pulse bg-mist" />
              <div className="h-12 rounded-lg animate-pulse bg-mist" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          <div className="mt-10 w-full h-px bg-mist" />
          <p className="mt-6 text-xs text-charcoal/30 font-sans text-center">
            © {new Date().getFullYear()} SOPAT — Usage interne uniquement
          </p>
        </div>
      </div>
    </div>
  )
}
