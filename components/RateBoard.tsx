import Link from 'next/link'
import Change from './Change'
import Icon from './Icon'
import { localName, type Dict, type Locale } from '@/lib/i18n'
import type { BoardEntry } from '@/lib/data'
import type { Category } from '@/lib/types'
import { istToday, rupees, shortDate } from '@/lib/format'
import { categoryStyle } from '@/lib/tones'

/** Rate table grouped by category. Pass `limitPerCategory` for a compact home-page version. */
export default function RateBoard({
  categories,
  entries,
  t,
  locale,
  limitPerCategory,
}: {
  categories: Category[]
  entries: BoardEntry[]
  t: Dict
  locale: Locale
  limitPerCategory?: number
}) {
  const today = istToday()
  const groups = categories
    .map((c) => {
      let items = entries.filter((e) => e.category.id === c.id)
      // Grades with a posted rate first
      items = [...items].sort((a, b) => Number(!!b.row) - Number(!!a.row))
      return { category: c, items: limitPerCategory ? items.slice(0, limitPerCategory) : items }
    })
    .filter((g) => g.items.length)

  if (!groups.length) {
    return <div className="card p-8 text-center text-muted">{t.rates.noRates}</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map(({ category, items }) => {
        const style = categoryStyle(category.slug)
        return (
          <section key={category.id} className={`card overflow-hidden tone-${style.tone} border-t-[3px]! border-t-tone!`}>
            <h3 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-3">
              <span className="icon-tile size-9"><Icon name={style.icon} /></span>
              <span className="flex-1">{localName(category, locale)}</span>
              <Link href={`/rates?cat=${category.slug}`} className="text-xs font-sans font-semibold text-tone">
                {t.common.viewAll} →
              </Link>
            </h3>
            <ul>
              {items.map(({ grade, row }) => (
                <li key={grade.id} className="border-b border-line last:border-0">
                  <Link href={`/rates/${grade.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-tone-soft/40">
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{localName(grade, locale)}</span>
                      {row && (
                        <span className="block text-xs text-muted">
                          {row.source_count} {t.rates.buyers}
                          {row.latest_date !== today && ` · ${t.rates.asOf} ${shortDate(row.latest_date)}`}
                        </span>
                      )}
                    </span>
                    {row ? (
                      <>
                        <Change now={row.best_price} prev={row.prev_price} />
                        <span className="text-right min-w-[5.5rem]">
                          <span className="block font-display font-bold text-lg tabular">{rupees(row.best_price)}</span>
                          <span className="block text-[11px] text-muted">/{t.units[grade.unit]}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted/70">{t.rates.noRates}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
