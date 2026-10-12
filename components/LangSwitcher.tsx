'use client'

import { useTransition } from 'react'
import { setLocale } from '@/app/actions/locale'

const OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'hi', label: 'हिं' },
  { value: 'pa', label: 'ਪੰ' },
]

export default function LangSwitcher({ locale }: { locale: string }) {
  const [pending, start] = useTransition()
  return (
    <div className={`flex rounded-lg bg-bg border border-line p-0.5 text-xs shrink-0 ${pending ? 'opacity-60' : ''}`} role="group" aria-label="Language">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => start(() => setLocale(o.value))}
          aria-pressed={locale === o.value}
          className={`px-2 py-1 rounded-md ${locale === o.value ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
