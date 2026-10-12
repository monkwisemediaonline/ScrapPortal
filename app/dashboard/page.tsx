import type { Metadata } from 'next'
import Link from 'next/link'
import Icon, { type IconName } from '@/components/Icon'
import StatusPill from '@/components/StatusPill'
import LotStatus from '@/components/LotStatus'
import { cancelSellRequest } from '@/app/actions/member'
import { requireMember, canSell, canBuy } from '@/lib/auth'
import { getCatalog, gradeMap } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { dateTime, num, rupees } from '@/lib/format'
import type { Bid, Deal, Lot, SellRequest } from '@/lib/types'

export const metadata: Metadata = { title: 'My account' }

export default async function Dashboard({ searchParams }: PageProps<'/dashboard'>) {
  const { sent } = await searchParams
  const { supabase, profile } = await requireMember()
  const [{ t, locale }, { grades }] = await Promise.all([getDict(), getCatalog()])
  const g = gradeMap(grades)

  const [{ data: requests }, { data: lots }, { data: bids }, { data: deals }] = await Promise.all([
    supabase.from('sell_requests').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('lots').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('bids').select('*, lots!bids_lot_id_fkey(title, status, closes_at)').eq('buyer_id', profile.id).order('updated_at', { ascending: false }).limit(20),
    supabase.from('deals').select('*').or(`seller_id.eq.${profile.id},buyer_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(20),
  ])

  const a = t.account
  const seller = canSell(profile) || profile.role !== 'buyer'
  const buyer = canBuy(profile) || profile.role === 'buyer' || profile.role === 'both'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl">
            {a.hello}, {profile.full_name?.split(' ')[0] ?? ''}
          </h1>
          <p className="text-sm text-muted mt-1">
            {profile.business_name} · {a.memberId} <span className="tabular">{profile.public_code}</span>
          </p>
        </div>
        <StatusPill status={profile.status} label={profile.status === 'approved' ? a.approved : undefined} />
      </div>

      {sent && <div className="card bg-ok-soft border-transparent px-4 py-3 text-sm font-medium text-up">{t.sell.sent}</div>}
      {profile.status === 'pending' && (
        <div className="card bg-warn-soft border-transparent px-4 py-3">
          <p className="font-semibold">{a.pendingTitle}</p>
          <p className="text-sm mt-0.5">{a.pendingBody}</p>
        </div>
      )}
      {['rejected', 'suspended'].includes(profile.status) && (
        <div className="card bg-[#fdecea] border-transparent px-4 py-3">
          <p className="font-semibold">{a.rejectedTitle}</p>
          <p className="text-sm mt-0.5">{a.rejectedBody}</p>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat tone="tone-green" icon="check" label={a.myDeals} value={deals?.length ?? 0} />
        {seller && <Stat tone="tone-blue" icon="inbox" label={a.mySellRequests} value={requests?.length ?? 0} />}
        {seller && <Stat tone="tone-orange" icon="gavel" label={a.myLots} value={lots?.length ?? 0} />}
        {buyer && <Stat tone="tone-purple" icon="tag" label={a.myBids} value={bids?.length ?? 0} />}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        {seller && <Action href="/sell" tone="tone-green" icon="tag" label={a.quickSell} />}
        {seller && <Action href="/lots/new" tone="tone-orange" icon="plus" label={a.newLot} />}
        <Action href="/lots" tone="tone-blue" icon="gavel" label={a.browseLots} />
      </div>

      <Section title={a.myDeals} show={!!deals?.length}>
        {((deals ?? []) as Deal[]).map((d) => (
          <Row key={d.id} href={`/deals/${d.id}`}>
            <span className="flex-1">
              <b>{localName(g.get(d.grade_id), locale)}</b>
              <span className="block text-xs text-muted">
                {d.origin === 'auction' ? t.deals.auction : t.deals.rateCard} · {rupees(d.agreed_rate)}/{t.units[d.unit]} · {dateTime(d.created_at)}
              </span>
            </span>
            <StatusPill status={d.status} label={t.deals.status[d.status]} />
          </Row>
        ))}
      </Section>

      {seller && (
        <Section title={a.mySellRequests} show={!!requests?.length}>
          {((requests ?? []) as SellRequest[]).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <span className="flex-1">
                <b>{localName(g.get(r.grade_id), locale)}</b> · <span className="tabular">{num(r.quantity)} {t.units[r.quantity_unit]}</span>
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
      )}

      {seller && (
        <Section title={a.myLots} show={!!lots?.length}>
          {((lots ?? []) as Lot[]).map((l) => (
            <Row key={l.id} href={`/lots/${l.id}`}>
              <span className="flex-1">
                <b>{l.title}</b>
                <span className="block text-xs text-muted">{localName(g.get(l.grade_id), locale)} · {dateTime(l.closes_at)}</span>
              </span>
              <LotStatus lot={l} t={t} />
            </Row>
          ))}
        </Section>
      )}

      {buyer && (
        <Section title={a.myBids} show={!!bids?.length}>
          {((bids ?? []) as (Bid & { lots: Pick<Lot, 'title' | 'status' | 'closes_at'> })[]).map((b) => (
            <Row key={b.id} href={`/lots/${b.lot_id}`}>
              <span className="flex-1">
                <b>{b.lots?.title}</b>
                <span className="block text-xs text-muted tabular">{t.lots.yourBid}: {rupees(b.rate)}</span>
              </span>
              <StatusPill status={b.status} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  )
}

function Stat({ tone, icon, label, value }: { tone: string; icon: IconName; label: string; value: number }) {
  return (
    <div className={`${tone} card p-4 flex items-center gap-3`}>
      <span className="icon-tile size-11"><Icon name={icon} size={22} /></span>
      <div className="min-w-0">
        <p className="font-display font-extrabold text-2xl leading-none tabular">{value}</p>
        <p className="text-xs text-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

function Action({ href, tone, icon, label }: { href: string; tone: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className={`${tone} card p-4 flex items-center gap-3 border-l-4! border-l-tone! hover:shadow-md transition-shadow`}>
      <span className="icon-tile size-10"><Icon name={icon} size={20} /></span>
      <span className="font-semibold flex-1">{label}</span>
      <span className="text-tone font-bold">→</span>
    </Link>
  )
}

function Section({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <section className="card overflow-hidden">
      <h2 className="px-4 py-3 border-b border-line font-semibold">{title}</h2>
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
