import { Page } from '@react-pdf/renderer'
import { baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

export function RealisationPage({ projects }: { projects: ProjectWithAssets[] }) {
  const urls = projects
    .flatMap((p) => p.sitePhotos.slice(0, 2).map((a) => a.secureUrl))
    .slice(0, 12)
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Partie réalisation</SectionTitle>
      <ImageGrid urls={urls} cols={3} />
      <Footer pageLabel="Réalisation" />
    </Page>
  )
}
