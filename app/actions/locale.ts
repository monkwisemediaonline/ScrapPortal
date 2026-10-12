'use server'

import { cookies } from 'next/headers'
import { refresh } from 'next/cache'
import { LOCALES, type Locale } from '@/lib/i18n'

export async function setLocale(locale: string) {
  if (!LOCALES.includes(locale as Locale)) return
  ;(await cookies()).set('lang', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  refresh()
}
