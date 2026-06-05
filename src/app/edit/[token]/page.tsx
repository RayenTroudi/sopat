import { resolveToken } from '@/lib/jwt'
import {
  TokenExpiredScreen,
  TokenUsedScreen,
  TokenInvalidScreen,
} from '@/components/token-pages/TokenPageShell'
import { EditClient } from './EditClient'

export const dynamic = 'force-dynamic'

type Params = Promise<{ token: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { token } = await params
  const resolved = await resolveToken(token)
  if (resolved.state !== 'valid') return { title: 'Modification budget | SOPAT' }
  return { title: `Modification budget — ${resolved.project.reference} | SOPAT` }
}

export default async function EditPage({ params }: { params: Params }) {
  const { token } = await params
  const resolved = await resolveToken(token)

  if (resolved.state === 'expired') return <TokenExpiredScreen />
  if (resolved.state === 'used')    return <TokenUsedScreen action="edit" />
  if (resolved.state === 'invalid') return <TokenInvalidScreen />

  const { prediction, project, chef } = resolved

  return (
    <EditClient
      token={token}
      chefName={chef.name}
      project={{
        name:       project.name,
        reference:  project.reference,
        clientName: project.clientName,
      }}
      prediction={{
        predictedTotal: parseFloat(prediction.predictedTotal),
        breakdown: {
          plants:    parseFloat(prediction.breakdownPlants    ?? '0'),
          soil:      parseFloat(prediction.breakdownSoil      ?? '0'),
          labor:     parseFloat(prediction.breakdownLabor     ?? '0'),
          equipment: parseFloat(prediction.breakdownEquipment ?? '0'),
          logistics: parseFloat(prediction.breakdownLogistics ?? '0'),
        },
        topCostDrivers: prediction.topCostDrivers ?? [],
        modelVersion:   prediction.modelVersion   ?? 'v1',
      }}
    />
  )
}
