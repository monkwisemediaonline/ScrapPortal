import type { Metadata } from 'next'
import Link from 'next/link'
import Countdown from '@/components/Countdown'
import Icon from '@/components/Icon'
import { PageBanner } from '@/components/Blocks'
import LotStatus from '@/components/LotStatus'
import { requireMember, canSell } from '@/lib/auth'
import { getCatalog, gradeMap } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { num, rupees } from '@/lib/format'
import { categoryStyle } from '@/lib/tones'
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
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-6">
      <PageBanner color="grad-purple" icon="gavel" title={t.lots.title} sub={t.lots.sub}>
        {canSell(profile) && <Link href="/lots/new" className="btn bg-white text-[#6d28d9] hover:bg-white/90">+ {t.lots.newLot}</Link>}
      </PageBanner>

      {/* How it works, in three pictures */}
      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        {([['tone-orange', 'plus', t.lots.how1], ['tone-blue', 'tag', t.lots.how2], ['tone-green', 'check', t.lots.how3]] as const).map(([tone, icon, text], i) => (
          <div key={text} className={`${tone} card p-3 flex items-center gap-3`}>
            <span className="icon-tile size-10"><Icon name={icon} size={20} /></span>
            <span className="text-sm font-medium"><b className="text-tone">{i + 1}.</b> {text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto mt-5 pb-1 [scrollbar-width:none]">
        <Link href="/lots" className={`pill py-1.5 px-3 text-sm ${!activeCat ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}>
          {t.common.all}
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/lots?cat=${c.slug}`} className={`pill py-1.5 px-3 text-sm ${activeCat?.id === c.id ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}>
            {localName(c, locale)}
          </Link>
        ))}
      </div>

      {lots.length === 0 ? (
        <div className="tone-purple card p-10 text-center mt-5">
          <span className="icon-tile size-16 mx-auto rounded-2xl!"><Icon name="gavel" size={32} /></span>
          <p className="font-display font-bold text-lg mt-4">{t.lots.emptyTitle}</p>
          <p className="text-muted text-sm mt-1">{t.lots.emptySub}</p>
          {canSell(profile) && <Link href="/lots/new" className="btn btn-primary mt-4">+ {t.lots.newLot}</Link>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {lots.map((l, i) => {
            const s = summaries[i]
            const style = categoryStyle(categories.find((c) => c.id === g.get(l.grade_id)?.category_id)?.slug)
            return (
              <Link key={l.id} href={`/lots/${l.id}`} className={`tone-${style.tone} card overflow-hidden hover:shadow-md transition-shadow flex flex-col`}>
                <div className="aspect-[16/9] bg-tone-soft text-tone relative grid place-items-center">
                  {l.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photos[0]} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <Icon name={style.icon} size={44} />
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
