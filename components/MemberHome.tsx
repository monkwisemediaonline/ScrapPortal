import Link from 'next/link'
import Icon, { type IconName } from './Icon'
import LotStatus from './LotStatus'
import StatusPill from './StatusPill'
import { cancelSellRequest } from '@/app/actions/member'
import { localName, type Dict, type Locale } from '@/lib/i18n'
import { dateTime, num, rupees } from '@/lib/format'
import type { Bid, Deal, Grade, Lot, Profile, SellRequest } from '@/lib/types'

export type BidWithLot = Bid & { lots: Pick<Lot, 'title' | 'status' | 'closes_at'> | null }
export type TopRate = { slug: string; name: string; price: number; unit: string }

/**
 * A member's home screen. Built for people who are not used to software:
 * four big colour buttons with pictures first, details below.
 */
export default function MemberHome({
  profile,
  t,
  locale,
  grades,
  topRates,
  deals,
  requests,
  lots,
  bids,
  sent,
  listsOnly,
}: {
  profile: Pick<Profile, 'full_name' | 'business_name' | 'public_code' | 'status' | 'role'>
  t: Dict
  locale: Locale
  grades: Map<string, Grade>
  topRates: TopRate[]
  deals: Deal[]
  requests: SellRequest[]
  lots: Lot[]
  bids: BidWithLot[]
  sent?: boolean
  /** Admin profile page: show only the trade lists, without the member welcome and buttons */
  listsOnly?: boolean
}) {
  const a = t.account
  const sells = profile.role !== 'buyer'
  const buys = profile.role !== 'seller'
  const nothing = !deals.length && !requests.length && !lots.length && !bids.length

  return (
    <div className={`mx-auto max-w-5xl px-4 lg:px-6 space-y-6 ${listsOnly ? "pb-6" : "py-6"}`}>
      {/* Welcome */}
      {!listsOnly && <div className="hero-bg text-white rounded-2xl p-5 md:p-6 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl">
            {a.hello}, {profile.full_name?.split(' ')[0] ?? ''} 👋
          </h1>
          <p className="text-white/80 mt-1 text-lg">{a.ask}</p>
          <p className="text-xs text-white/60 mt-2">
            {profile.business_name} · {a.memberId} <span className="tabular">{profile.public_code}</span>
          </p>
        </div>
        <StatusPill status={profile.status} label={profile.status === 'approved' ? `✓ ${a.approved}` : undefined} />
      </div>}

      {sent && <div className="card bg-ok-soft border-transparent px-4 py-3 font-medium text-up">✓ {t.sell.sent}</div>}
      {!listsOnly && profile.status === 'pending' && (
        <div className="card bg-warn-soft border-transparent px-4 py-3">
          <p className="font-semibold">⏳ {a.pendingTitle}</p>
          <p className="text-sm mt-0.5">{a.pendingBody}</p>
        </div>
      )}
      {['rejected', 'suspended'].includes(profile.status) && (
        <div className="card bg-[#fdecea] border-transparent px-4 py-3">
          <p className="font-semibold">{a.rejectedTitle}</p>
          <p className="text-sm mt-0.5">{a.rejectedBody}</p>
        </div>
      )}

      {/* Big buttons */}
      <div className={listsOnly ? "hidden" : "grid grid-cols-2 lg:grid-cols-4 gap-3"}>
        {sells && <Big href="/sell" color="grad-green" icon="tag" title={a.bigSell} sub={a.bigSellSub} />}
        <Big href="/rates" color="grad-blue" icon="chart" title={a.bigRates} sub={a.bigRatesSub} />
        {sells && <Big href="/lots/new" color="grad-orange" icon="plus" title={a.bigAuction} sub={a.bigAuctionSub} />}
        {buys && <Big href="/lots" color="grad-purple" icon="gavel" title={a.bigBid} sub={a.bigBidSub} />}
      </div>

      {/* Today's rates at a glance */}
      {!listsOnly && topRates.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-lg">{a.todayRates}</h2>
            <Link href="/rates" className="text-sm font-semibold text-accent">{t.common.viewAll} →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {topRates.map((r) => (
              <Link key={r.slug} href={`/rates/${r.slug}`} className="card p-4 hover:shadow-md transition-shadow">
                <p className="text-sm text-muted truncate">{r.name}</p>
                <p className="font-display font-extrabold text-2xl tabular mt-1">
                  {rupees(r.price)}
                  <span className="text-xs font-sans font-medium text-muted"> /{r.unit}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {nothing && !listsOnly && <p className="card p-6 text-center text-muted">{a.nothingYet}</p>}

      <Section tone="tone-green" icon="check" title={a.myDeals} show={deals.length > 0}>
        {deals.map((d) => (
          <Row key={d.id} href={`/deals/${d.id}`}>
            <span className="flex-1 min-w-0">
              <b>{localName(grades.get(d.grade_id), locale)}</b>
              <span className="block text-xs text-muted">
                {d.origin === 'auction' ? t.deals.auction : t.deals.rateCard} · {rupees(d.agreed_rate)}/{t.units[d.unit]} · {dateTime(d.created_at)}
              </span>
            </span>
            <StatusPill status={d.status} label={t.deals.status[d.status]} />
          </Row>
        ))}
      </Section>

      <Section tone="tone-blue" icon="inbox" title={a.mySellRequests} show={requests.length > 0}>
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <span className="flex-1 min-w-0">
              <b>{localName(grades.get(r.grade_id), locale)}</b> · <span className="tabular">{num(r.quantity)} {t.units[r.quantity_unit]}</span>
              <span className="block text-xs text-muted">
                {r.quoted_price ? `${rupees(r.quoted_price)}/${t.units[r.unit]} · ` : ''}{dateTime(r.created_at)}
              </span>
            </span>
            {r.status === 'new' && (
              <form action={cancelSellRequest.bind(null, r.id)}>
                <button className="text-xs text-muted underline">{t.sell.cancel}</button>
              </form>
            )}
            {r.deal_id ? (
              <Link href={`/deals/${r.deal_id}`}><StatusPill status={r.status} label={t.sell.reqStatus[r.status]} /></Link>
            ) : (
              <StatusPill status={r.status} label={t.sell.reqStatus[r.status]} />
            )}
          </div>
        ))}
      </Section>

      <Section tone="tone-orange" icon="gavel" title={a.myLots} show={lots.length > 0}>
        {lots.map((l) => (
          <Row key={l.id} href={`/lots/${l.id}`}>
            <span className="flex-1 min-w-0">
              <b>{l.title}</b>
              <span className="block text-xs text-muted">{localName(grades.get(l.grade_id), locale)} · {dateTime(l.closes_at)}</span>
            </span>
            <LotStatus lot={l} t={t} />
          </Row>
        ))}
      </Section>

      <Section tone="tone-purple" icon="tag" title={a.myBids} show={bids.length > 0}>
        {bids.map((b) => (
          <Row key={b.id} href={`/lots/${b.lot_id}`}>
            <span className="flex-1 min-w-0">
              <b>{b.lots?.title}</b>
              <span className="block text-xs text-muted tabular">{t.lots.yourBid}: {rupees(b.rate)}</span>
            </span>
            <StatusPill status={b.status} />
          </Row>
        ))}
      </Section>
    </div>
  )
}

function Big({ href, color, icon, title, sub }: { href: string; color: string; icon: IconName; title: string; sub: string }) {
  return (
    <Link href={href} className={`grad ${color} big-action`}>
      <span className="grid place-items-center size-14 rounded-2xl bg-white/20"><Icon name={icon} size={30} /></span>
      <span className="mt-auto">
        <span className="block font-display font-extrabold text-xl leading-tight">{title}</span>
        <span className="block text-sm text-white/85 mt-0.5">{sub}</span>
      </span>
    </Link>
  )
}

function Section({ tone, icon, title, show, children }: { tone: string; icon: IconName; title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <section className={`${tone} card overflow-hidden`}>
      <h2 className="px-4 py-3 border-b border-line font-semibold flex items-center gap-2.5">
        <span className="icon-tile size-8"><Icon name={icon} size={17} /></span>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-bg">
      {children}
    </Link>
  )
}
