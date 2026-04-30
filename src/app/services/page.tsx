import Nav from '@/components/Nav'
import ServicesHero from '@/components/services/ServicesHero'
import ServicesDetail from '@/components/services/ServicesDetail'
import ServicesCategories from '@/components/services/ServicesCategories'
import ServicesCta from '@/components/services/ServicesCta'

export const metadata = {
  title: 'Nos Services — SOPAT · Architecture Paysagère',
  description: "Études, réalisation et entretien paysager. SOPAT offre les solutions les plus complètes pour vos espaces verts en Tunisie et à l'international.",
}

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main>
        <ServicesHero />
        <ServicesDetail />
        <ServicesCategories />
        <ServicesCta />
      </main>
    </>
  )
}
