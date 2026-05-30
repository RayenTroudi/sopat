import Image from 'next/image'
import Link from 'next/link'
import { getPages } from '@/lib/api'
import WpNavbarClient from '@/components/WpNavbarClient'

const staticLinks = [
  { label: 'Accueil', href: '/' },
  { label: 'Blog', href: '/posts' },
]

export default async function WpNavbar() {
  let pages: { slug: string; title: string }[] = []
  try {
    const raw = await getPages(20)
    pages = raw
      .filter((p) => p.parent === 0)
      .sort((a, b) => a.menu_order - b.menu_order)
      .map((p) => ({ slug: p.slug, title: p.title.rendered }))
  } catch {
    // fall back to static links if API is unavailable
  }

  const allLinks = [
    ...staticLinks,
    ...pages.map((p) => ({ label: p.title, href: `/pages/${p.slug}` })),
  ]

  return <WpNavbarClient links={allLinks} />
}
