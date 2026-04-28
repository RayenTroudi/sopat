import Nav from '@/components/Nav'
import ProposHero from '@/components/propos/ProposHero'
import ProposStory from '@/components/propos/ProposStory'
import ProposValues from '@/components/propos/ProposValues'
import ProposVideo from '@/components/propos/ProposVideo'
import ProposGallery from '@/components/propos/ProposGallery'
import ProposFooterCta from '@/components/propos/ProposFooterCta'

export const metadata = {
  title: 'À Propos — SOPAT · Société de Paysage de Tunisie',
  description:
    "Découvrez l'histoire, la vision et les valeurs de SOPAT — 72 experts au service de l'architecture paysagère depuis plus de 20 ans.",
}

export default function ProposPage() {
  return (
    <>
      <Nav />
      <main>
        <ProposHero />
        <ProposStory />
        <ProposVideo />
        <ProposGallery />
        <ProposValues />
        <ProposFooterCta />
      </main>
    </>
  )
}
