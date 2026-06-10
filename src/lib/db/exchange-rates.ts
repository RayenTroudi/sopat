import { db } from '../../../db/index'
import { exchangeRates } from '../../../db/schema'
import { eq, desc, lte, and } from 'drizzle-orm'
import type { Currency } from '../currency'

export type ExchangeRateRow = {
  id:            string
  fromCurrency:  string
  toCurrency:    string
  rate:          string   // decimal string from DB
  effectiveDate: string   // date string "YYYY-MM-DD"
  source:        string | null
  createdAt:     Date
}

export type UpsertRateInput = {
  fromCurrency:  Currency
  rate:          string   // decimal string e.g. "3.300000"
  effectiveDate: string   // "YYYY-MM-DD"
  source?:       string
  createdBy?:    string
}

/** Returns the most recent rate for each currency (for dashboard display). */
export async function getCurrentRates(): Promise<ExchangeRateRow[]> {
  const currencies: Currency[] = ['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']
  const results: ExchangeRateRow[] = []

  for (const currency of currencies) {
    const row = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.fromCurrency, currency))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1)

    if (row[0]) {
      results.push({
        id:            row[0].id,
        fromCurrency:  row[0].fromCurrency,
        toCurrency:    row[0].toCurrency,
        rate:          row[0].rate,
        effectiveDate: row[0].effectiveDate,
        source:        row[0].source,
        createdAt:     row[0].createdAt,
      })
    }
  }

  return results
}

/** Returns all historical rates for a specific currency, newest first. */
export async function getRateHistory(currency: Currency): Promise<ExchangeRateRow[]> {
  const rows = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.fromCurrency, currency))
    .orderBy(desc(exchangeRates.effectiveDate))

  return rows.map((r) => ({
    id:            r.id,
    fromCurrency:  r.fromCurrency,
    toCurrency:    r.toCurrency,
    rate:          r.rate,
    effectiveDate: r.effectiveDate,
    source:        r.source,
    createdAt:     r.createdAt,
  }))
}

/** Returns the most recent rate on or before `onDate` for `fromCurrency`. */
export async function getRateOnDate(
  fromCurrency: Currency,
  onDate: string  // "YYYY-MM-DD"
): Promise<number | null> {
  const row = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        lte(exchangeRates.effectiveDate, onDate)
      )
    )
    .orderBy(desc(exchangeRates.effectiveDate))
    .limit(1)

  return row[0]?.rate ? parseFloat(row[0].rate) : null
}

/** Inserts a new rate record. */
export async function insertRate(input: UpsertRateInput): Promise<ExchangeRateRow> {
  const [row] = await db
    .insert(exchangeRates)
    .values({
      fromCurrency:  input.fromCurrency,
      toCurrency:    'TND',
      rate:          input.rate,
      effectiveDate: input.effectiveDate,
      source:        input.source ?? null,
    })
    .returning()

  return {
    id:            row.id,
    fromCurrency:  row.fromCurrency,
    toCurrency:    row.toCurrency,
    rate:          row.rate,
    effectiveDate: row.effectiveDate,
    source:        row.source,
    createdAt:     row.createdAt,
  }
}
