import { cookies } from 'next/headers'
import en, { type Dict } from './en'
import hi from './hi'
import pa from './pa'

export const LOCALES = ['en', 'hi', 'pa'] as const
export type Locale = (typeof LOCALES)[number]
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', hi: 'हिंदी', pa: 'ਪੰਜਾਬੀ' }
export type { Dict }

const dicts: Record<Locale, Dict> = { en, hi, pa }

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get('lang')?.value
  return LOCALES.includes(value as Locale) ? (value as Locale) : 'en'
}

export async function getDict() {
  const locale = await getLocale()
  return { t: dicts[locale], locale }
}

/** Picks name_hi / name_pa from a catalog row, falling back to English. */
export function localName(row: { name_en: string; name_hi?: string | null; name_pa?: string | null } | null | undefined, locale: Locale) {
  if (!row) return ''
  if (locale === 'hi' && row.name_hi) return row.name_hi
  if (locale === 'pa' && row.name_pa) return row.name_pa
  return row.name_en
}
