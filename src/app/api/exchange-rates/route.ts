import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCurrentRates, getRateHistory, insertRate } from '@/lib/db/exchange-rates'
import { z } from 'zod'
import type { Currency } from '@/lib/currency'

const CURRENCIES: Currency[] = ['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']

const insertSchema = z.object({
  fromCurrency:  z.enum(['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']),
  rate:          z.string().regex(/^\d+(\.\d+)?$/, 'Taux invalide'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)'),
  source:        z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const currency = searchParams.get('currency') as Currency | null

  try {
    if (currency && CURRENCIES.includes(currency)) {
      const history = await getRateHistory(currency)
      return NextResponse.json(history)
    }
    const current = await getCurrentRates()
    return NextResponse.json(current)
  } catch (err) {
    console.error('[GET /api/exchange-rates]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = insertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await insertRate({ ...parsed.data, createdBy: session.user.userId })
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error('[POST /api/exchange-rates]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
