export type Currency = 'TND' | 'EUR' | 'OMR' | 'XOF' | 'QAR' | 'LYD' | 'USD'

const SYMBOLS: Record<Currency, string> = {
  TND: 'DT',
  EUR: '€',
  OMR: 'OMR',
  XOF: 'FCFA',
  QAR: 'QAR',
  LYD: 'LYD',
  USD: '$',
}

const DECIMAL_PLACES: Record<Currency, number> = {
  TND: 3,
  EUR: 2,
  OMR: 3,
  XOF: 0,
  QAR: 2,
  LYD: 3,
  USD: 2,
}

export function getCurrencySymbol(currency: Currency | string): string {
  return SYMBOLS[currency as Currency] ?? currency
}

export function formatCurrency(amount: number, currency: Currency | string): string {
  const decimals = DECIMAL_PLACES[currency as Currency] ?? 2
  const symbol = getCurrencySymbol(currency)
  const fmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  // EUR and USD use prefix symbol; others use suffix
  if (currency === 'EUR' || currency === 'USD') {
    return `${symbol} ${fmt.format(amount)}`
  }
  return `${fmt.format(amount)} ${symbol}`
}

export function formatTND(amount: number): string {
  return formatCurrency(amount, 'TND')
}

/**
 * rate = how many TND per 1 unit of fromCurrency.
 */
export function convertToTNDWithRate(amount: number, rate: number): number {
  return amount * rate
}

/**
 * Converts amount in any currency to TND using the most recent rate on or before the given date.
 * Returns null if no rate is found (e.g. TND→TND returns amount directly).
 */
export async function convertToTND(
  amount: number,
  currency: Currency | string,
  date: string  // "YYYY-MM-DD"
): Promise<number | null> {
  if (currency === 'TND') return amount
  const { getRateOnDate } = await import('@/lib/db/exchange-rates')
  const rate = await getRateOnDate(currency as Currency, date)
  if (rate === null) return null
  return amount * rate
}
