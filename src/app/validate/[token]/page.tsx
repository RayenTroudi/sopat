import { resolveToken } from '@/lib/jwt'
import {
  TokenExpiredScreen,
  TokenUsedScreen,
  TokenInvalidScreen,
} from '@/components/token-pages/TokenPageShell'
import { ValidateClient } from './ValidateClient'

export const dynamic = 'force-dynamic'

type Params = Promise<{ token: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { token } = await params
  const resolved = await resolveToken(token)
  if (resolved.state !== 'valid') return { title: 'Validation budget | SOPAT' }
  return { title: `Validation budget — ${resolved.project.reference} | SOPAT` }
}

export default async function ValidatePage({ params }: { params: Params }) {
  const { token } = await params
  const resolved = await resolveToken(token)

  if (resolved.state === 'expired') return <TokenExpiredScreen />
  if (resolved.state === 'used')    return <TokenUsedScreen action="validate" />
  if (resolved.state === 'invalid') return <TokenInvalidScreen />

  const { prediction, project, chef } = resolved

  return (
    <ValidateClient
      token={token}
      chefName={chef.name}
      project={{
        name:       project.name,
        reference:  project.reference,
        clientName: project.clientName,
      }}
      prediction={{
        predictedTotal:  parseFloat(prediction.predictedTotal),
        confidenceLow:   parseFloat(prediction.confidenceLow   ?? '0'),
        confidenceHigh:  parseFloat(prediction.confidenceHigh  ?? '0'),
        confidenceScore: prediction.confidenceScore             ?? 0,
        breakdown: {
          plants:    parseFloat(prediction.breakdownPlants    ?? '0'),
          soil:      parseFloat(prediction.breakdownSoil      ?? '0'),
          labor:     parseFloat(prediction.breakdownLabor     ?? '0'),
          equipment: parseFloat(prediction.breakdownEquipment ?? '0'),
          logistics: parseFloat(prediction.breakdownLogistics ?? '0'),
        },
        topCostDrivers: prediction.topCostDrivers ?? [],
        modelVersion:   prediction.modelVersion   ?? 'v1',
        isFallback:     prediction.isFallback,
      }}
    />
  )
}
