import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sparkline from '@/components/Sparkline'
import Change from '@/components/Change'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { istDaysAgo, rupees, shortDate } from '@/lib/format'
import type { Category, Grade, Rate, RateSource } from '@/lib/types'

export default async function GradeRatePage({ params }: PageProps<'/rates/[slug]'>) {
  const { slug } = await params
  if (!supabaseConfigured) notFound()
  const supabase = await createClient()
  const { t, locale } = await getDict()

  const { data: grade } = await supabase.from('grades').select('*').eq('slug', slug).single<Grade>()
  if (!grade) notFound()

  const since = istDaysAgo(31)
  const [{ data: category }, { data: rates }, { data: sources }] = await Promise.all([
    supabase.from('categories').select('*').eq('id', grade.category_id).single<Category>(),
    supabase.from('rates').select('*').eq('grade_id', grade.id).gte('rate_date', since).order('rate_date'),
    supabase.from('rate_sources').select('*').eq('active', true),
  ])

  const srcById = new Map(((sources ?? []) as RateSource[]).map((s) => [s.id, s]))
  const live = ((rates ?? []) as Rate[]).filter((r) => srcById.has(r.source_id))

  // Best price per day for the trend line
  const bestByDay = new Map<string, number>()
  for (const r of live) bestByDay.set(r.rate_date, Math.max(bestByDay.get(r.rate_date) ?? 0, Number(r.price)))
  const days = [...bestByDay.keys()].sort()
  const series = days.map((d) => bestByDay.get(d)!)
  const latestDate = days.at(-1)
  const offers = live.filter((r) => r.rate_date === latestDate).sort((a, b) => b.price - a.price)
  const best = series.at(-1)
  const prev = series.length > 1 ? series.at(-2)! : null
  const unit = t.units[grade.unit]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/rates?cat=${category?.slug ?? ''}`} className="text-sm text-muted hover:text-ink">
        ← {category ? localName(category, locale) : t.nav.rates}
      </Link>
      <h1 className="font-display font-extrabold text-3xl mt-2">{localName(grade, locale)}</h1>
      {grade.description && <p className="text-muted mt-1">{grade.description}</p>}

      <div className="card p-5 mt-6">
        {best !== undefined ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  {t.rates.best} · {t.rates.asOf} {shortDate(latestDate!)}
                </p>
                <p className="font-display font-extrabold text-4xl tabular mt-1">
                  {rupees(best)}
                  <span className="text-base font-sans font-medium text-muted"> /{unit}</span>
                </p>
                <div className="mt-1"><Change now={best} prev={prev} /></div>
              </div>
              <Link href={`/sell?grade=${grade.slug}`} className="btn btn-primary">{t.rates.sellAtRate}</Link>
            </div>
            {series.length > 1 && (
              <div className="mt-6">
                <p className="text-xs text-muted mb-1">{t.rates.history}</p>
                <Sparkline values={series} />
                <div className="flex justify-between text-[11px] text-muted tabular">
                  <span>{shortDate(days[0])}</span>
                  <span>{shortDate(latestDate!)}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted">{t.rates.noRates}</p>
        )}
      </div>

      {offers.length > 0 && (
        <div className="card mt-4 overflow-hidden">
          <h2 className="px-4 py-3 border-b border-line font-semibold">{t.rates.offersToday}</h2>
          <table className="table">
            <thead>
              <tr><th>{t.rates.buyer}</th><th className="text-right!">{t.rates.rate}</th></tr>
            </thead>
            <tbody>
              {offers.map((r) => {
                const s = srcById.get(r.source_id)!
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-medium">{s.public_label}</span>
                      {s.location && <span className="block text-xs text-muted">{s.location}</span>}
                      {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                    </td>
                    <td className="text-right font-semibold tabular">{rupees(r.price)}/{t.units[r.unit]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
