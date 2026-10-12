import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/components/ActionForm'
import ConfirmButton from '@/components/ConfirmButton'
import Countdown from '@/components/Countdown'
import LotStatus from '@/components/LotStatus'
import StatusPill from '@/components/StatusPill'
import { acceptBid, cancelLot, placeBid, withdrawBid } from '@/app/actions/member'
import { requireMember, canBuy } from '@/lib/auth'
import { getDict, localName } from '@/lib/i18n'
import { dateTime, num, rupees } from '@/lib/format'
import type { Bid, Grade, Lot } from '@/lib/types'

type PublicProfile = { id: string; public_code: string; area: string | null; verified: boolean }

export default async function LotPage({ params }: PageProps<'/lots/[id]'>) {
  const { id } = await params
  const { supabase, profile } = await requireMember()
  const { t, locale } = await getDict()
  const l = t.lots

  const { data: lot } = await supabase.from('lots').select('*').eq('id', id).maybeSingle<Lot>()
  if (!lot) notFound()

  const isOwner = lot.seller_id === profile.id
  const isAdmin = profile.role === 'admin'
  const [{ data: grade }, { data: summary }, { data: bidsData }, { data: deal }] = await Promise.all([
    supabase.from('grades').select('*').eq('id', lot.grade_id).single<Grade>(),
    supabase.rpc('lot_bid_summary', { p_lot_id: lot.id }),
    // RLS: owner/admin see every bid, a buyer sees only their own
    supabase.from('bids').select('*').eq('lot_id', lot.id).order('rate', { ascending: false }),
    supabase.from('deals').select('id').eq('lot_id', lot.id).maybeSingle(),
  ])
  const bids = (bidsData ?? []) as Bid[]
  const myBid = bids.find((b) => b.buyer_id === profile.id)
  const { top_rate, bid_count } = (summary?.[0] ?? { top_rate: null, bid_count: 0 }) as { top_rate: number | null; bid_count: number }

  let bidders = new Map<string, PublicProfile>()
  if ((isOwner || isAdmin) && bids.length) {
    const { data } = await supabase.from('public_profiles').select('*').in('id', bids.map((b) => b.buyer_id))
    bidders = new Map(((data ?? []) as PublicProfile[]).map((p) => [p.id, p]))
  }

  // eslint-disable-next-line react-hooks/purity
  const biddingOpen = lot.status === 'open' && new Date(lot.closes_at).getTime() > Date.now()
  const unit = t.units[lot.price_unit]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/lots" className="text-sm text-muted hover:text-ink">← {l.title}</Link>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-3">
        {/* Left: lot details */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <LotStatus lot={lot} t={t} />
            <span className="text-sm text-muted">{localName(grade, locale)} · {lot.area}</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl leading-tight">{lot.title}</h1>

          {lot.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {lot.photos.map((p, i) => (
                <a key={p} href={p} target="_blank" rel="noreferrer" className={i === 0 ? 'col-span-2 row-span-2' : ''}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="w-full h-full object-cover rounded-lg aspect-square" />
                </a>
              ))}
            </div>
          )}

          <dl className="card divide-y divide-line">
            <Fact label={t.common.quantity} value={`${num(lot.quantity)} ${t.units[lot.quantity_unit]}`} />
            {lot.min_rate && <Fact label={l.startRate} value={`${rupees(lot.min_rate)}/${unit}`} />}
            {lot.inspection_note && <Fact label={l.inspection} value={lot.inspection_note} />}
            <Fact label={l.closedAt} value={dateTime(lot.closes_at)} />
          </dl>
          {lot.description && <p className="whitespace-pre-line text-sm leading-relaxed">{lot.description}</p>}
        </div>

        {/* Right: bidding panel */}
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{top_rate ? l.topRate : l.noBids}</p>
                <p className="font-display font-extrabold text-3xl tabular">
                  {top_rate ? rupees(top_rate) : '—'}
                  <span className="text-sm font-sans font-medium text-muted"> /{unit}</span>
                </p>
                <p className="text-sm text-muted tabular">{bid_count} {l.bids}</p>
              </div>
              {lot.status === 'open' && (
                <div className="text-right">
                  <p className="text-xs text-muted">{l.closesIn}</p>
                  <p className="font-semibold text-lg"><Countdown to={lot.closes_at} closedLabel={l.closedAt} /></p>
                </div>
              )}
            </div>

            {deal && (
              <Link href={`/deals/${deal.id}`} className="btn btn-dark w-full mt-5">{l.viewDeal}</Link>
            )}

            {/* Buyer bid form */}
            {!isOwner && biddingOpen && (
              canBuy(profile) ? (
                <div className="mt-5 pt-5 border-t border-line">
                  {myBid && (
                    <p className="text-sm mb-3">
                      {l.yourBid}: <b className="tabular">{rupees(myBid.rate)}/{unit}</b>{' '}
                      <StatusPill status={myBid.status} />
                    </p>
                  )}
                  <ActionForm action={placeBid.bind(null, lot.id)} submitLabel={myBid?.status === 'active' ? l.updateBid : l.placeBid} submitClass="btn btn-primary w-full">
                    <div>
                      <label className="label" htmlFor="rate">{l.bidRate} (₹/{unit})</label>
                      <input
                        id="rate" name="rate" type="number" step="0.01" inputMode="decimal" required
                        min={lot.min_rate ?? 0.01} defaultValue={myBid?.rate}
                        className="input tabular text-lg"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="note">{l.bidNote}</label>
                      <input id="note" name="note" className="input" placeholder={l.bidNoteHint} defaultValue={myBid?.note ?? ''} />
                    </div>
                  </ActionForm>
                  {myBid?.status === 'active' && (
                    <form action={withdrawBid.bind(null, lot.id)} className="mt-2 text-center">
                      <button className="text-sm text-muted underline">{l.withdraw}</button>
                    </form>
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-lg bg-warn-soft p-3 text-sm">{l.needApprovalBuy}</p>
              )
            )}

            {!isOwner && !biddingOpen && myBid && (
              <p className="text-sm mt-4">
                {l.yourBid}: <b className="tabular">{rupees(myBid.rate)}/{unit}</b> <StatusPill status={myBid.status} />
              </p>
            )}

            {isOwner && lot.status === 'open' && (
              <form action={cancelLot.bind(null, lot.id)} className="mt-4 text-center">
                <ConfirmButton message={`${l.cancelLot}?`} className="text-sm text-muted underline">{l.cancelLot}</ConfirmButton>
              </form>
            )}
          </div>

          {/* Seller: choose a buyer */}
          {(isOwner || isAdmin) && bids.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <h2 className="font-semibold">{l.bidsReceived}</h2>
                {lot.status === 'open' && <p className="text-xs text-muted mt-0.5">{l.acceptHint}</p>}
              </div>
              <ul>
                {bids.map((b) => {
                  const who = bidders.get(b.buyer_id)
                  return (
                    <li key={b.id} className="px-4 py-3 border-b border-line last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display font-bold text-lg tabular">{rupees(b.rate)}<span className="text-xs font-sans text-muted">/{unit}</span></p>
                          <p className="text-xs text-muted">
                            {who?.verified && '✓ '}{l.verifiedBuyer} {who?.public_code}{who?.area ? ` · ${who.area}` : ''}
                          </p>
                          {b.note && <p className="text-sm mt-1">{b.note}</p>}
                        </div>
                        {lot.status === 'open' && b.status === 'active' ? (
                          <form action={acceptBid.bind(null, lot.id, b.id)}>
                            <ConfirmButton message={l.acceptHint}>{l.accept}</ConfirmButton>
                          </form>
                        ) : (
                          <StatusPill status={b.status} />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-right tabular">{value}</dd>
    </div>
  )
}
