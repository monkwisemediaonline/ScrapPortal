import type { Unit } from './types'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function rupees(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === '') return '—'
  return '₹' + inr.format(Number(n))
}

export function num(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === '') return '—'
  return inr.format(Number(n))
}

/** Today's date in India as YYYY-MM-DD. */
export function istToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

/** The date `n` days before today (India), as YYYY-MM-DD. */
export function istDaysAgo(n: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() - n * 864e5))
}

export function shortDate(d: string | Date) {
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00+05:30') : new Date(d)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

export function dateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

/** Converts weight in kg to the amount payable at a rate per unit. */
export function amountFor(weightKg: number, rate: number, unit: Unit) {
  if (unit === 'tonne') return (weightKg / 1000) * rate
  return weightKg * rate
}
