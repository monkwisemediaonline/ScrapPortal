import type { Metadata } from 'next'
import Link from 'next/link'
import Countdown from '@/components/Countdown'
import LotStatus from '@/components/LotStatus'
import { requireMember, canSell } from '@/lib/auth'
import { getCatalog, gradeMap } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { num, rupees } from '@/lib/format'
import type { Lot } from '@/lib/types'

export const metadata: Metadata = { title: 'Scrap auctions' }

export default async function LotsPage({ searchParams }: PageProps<'/lots'>) {
  const { cat } = await searchParams
  const { supabase, profile } = await requireMember()
  const [{ t, locale }, { categories, grades }] = await Promise.all([getDict(), getCatalog()])
  const g = gradeMap(grades)
  const activeCat = categories.find((c) => c.slug === cat)

  const { data } = await supabase
    .from('lots')
    .select('*')
    .eq('status', 'open')
    .order('closes_at', { ascending: true })
    .limit(60)
  const lots = ((data ?? []) as Lot[]).filter((l) => !activeCat || g.get(l.grade_id)?.category_id === activeCat.id)
  const summaries = await Promise.all(
    lots.map(async (l) => (await supabase.rpc('lot_bid_summary', { p_lot_id: l.id })).data?.[0] as { top_rate: number | null; bid_count: number } | undefined)
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">{t.lots.title}</h1>
          <p className="text-muted mt-1">{t.lots.sub}</p>
        </div>
        {canSell(profile) && <Link href="/lots/new" className="btn btn-primary">{t.lots.newLot}</Link>}
      </div>

      <div className="flex gap-2 overflow-x-auto mt-6 pb-1 [scrollbar-width:none]">
        <Link href="/lots" className={`pill py-1.5 px-3 text-sm ${!activeCat ? 'bg-steel text-white' : 'bg-surface border border-line'}`}>
          {t.common.all}
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/lots?cat=${c.slug}`} className={`pill py-1.5 px-3 text-sm ${activeCat?.id === c.id ? 'bg-steel text-white' : 'bg-surface border border-line'}`}>
            {localName(c, locale)}
          </Link>
        ))}
      </div>

      {lots.length === 0 ? (
        <div className="card p-10 text-center text-muted mt-5">{t.common.empty}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {lots.map((l, i) => {
            const s = summaries[i]
            return (
              <Link key={l.id} href={`/lots/${l.id}`} className="card overflow-hidden hover:border-accent flex flex-col">
                <div className="aspect-[16/9] bg-[#e9e7e1] relative">
                  {l.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photos[0]} alt="" className="absolute inset-0 size-full object-cover" />
                  )}
                  <span className="absolute top-2 left-2"><LotStatus lot={l} t={t} /></span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted">{localName(g.get(l.grade_id), locale)} · {l.area}</p>
                  <h2 className="font-semibold mt-0.5 line-clamp-2">{l.title}</h2>
                  <p className="text-sm text-muted tabular mt-1">{num(l.quantity)} {t.units[l.quantity_unit]}</p>
                  <div className="mt-auto pt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted">{s?.top_rate ? t.lots.topRate : l.min_rate ? t.lots.startRate : t.lots.noBids}</p>
                      <p className="font-display font-bold text-lg tabular">
                        {s?.top_rate ? rupees(s.top_rate) : l.min_rate ? rupees(l.min_rate) : '—'}
                        <span className="text-xs font-sans text-muted"> /{t.units[l.price_unit]}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p className="tabular">{s?.bid_count ?? 0} {t.lots.bids}</p>
                      <p className="font-semibold text-ink"><Countdown to={l.closes_at} closedLabel={t.lots.closedAt} /></p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
