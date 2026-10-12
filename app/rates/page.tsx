import type { Metadata } from 'next'
import Link from 'next/link'
import RateBoard from '@/components/RateBoard'
import { getBoard } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'

export const metadata: Metadata = { title: "Today's scrap rates in Ludhiana" }

export default async function RatesPage({ searchParams }: PageProps<'/rates'>) {
  const { cat } = await searchParams
  const [{ t, locale }, { categories, entries }] = await Promise.all([getDict(), getBoard()])
  const active = categories.find((c) => c.slug === cat)
  const shown = active ? [active] : categories

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display font-extrabold text-3xl">{t.rates.title}</h1>
      <p className="text-muted mt-1">{t.rates.sub}</p>

      <div className="flex gap-2 overflow-x-auto mt-6 pb-1 [scrollbar-width:none]">
        <Link href="/rates" className={`pill py-1.5 px-3 text-sm ${!active ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}>
          {t.common.all}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/rates?cat=${c.slug}`}
            className={`pill py-1.5 px-3 text-sm ${active?.id === c.id ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}
          >
            {localName(c, locale)}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        <RateBoard categories={shown} entries={entries} t={t} locale={locale} />
      </div>
    </div>
  )
}
