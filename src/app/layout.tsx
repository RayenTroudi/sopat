import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'
import BackToTop from '@/components/BackToTop'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SOPAT — Architecture Paysagère · Tunisie & International',
  description:
    'Société de Paysage de Tunisie. Architecture paysagère haut de gamme. 72 experts, +3500 projets, 5 pays.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${dmSans.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <BackToTop />
      </body>
    </html>
  )
}
