import Link from 'next/link'
import ActionForm from './ActionForm'
import ConfirmButton from './ConfirmButton'
import Icon from './Icon'
import PhotoInput from './PhotoInput'
import StatusPill from './StatusPill'
import { updateDeal } from '@/app/actions/member'
import { confirmPayment, recordPayment, sendDealMessage } from '@/app/actions/deal'
import type { Dict } from '@/lib/i18n'
import { dateTime, num, rupees, shortDate } from '@/lib/format'
import { invoiceTotals, type InvoiceParty } from '@/lib/invoice'
import { DEAL_STATUSES, type Deal, type DealStatus } from '@/lib/types'

export type DealMessage = { id: number; sender_id: string; body: string; created_at: string }
export type DealEvent = { id: number; status: DealStatus; created_at: string }

const STEPS: DealStatus[] = ['confirmed', 'pickup_scheduled', 'weighed', 'payment_pending', 'completed']

/** Everything about one deal: progress, money, payment, messages, contacts. */
export default function DealView({
  deal,
  gradeName,
  t,
  viewer,
  parties,
  messages,
  events,
  supportPhone,
}: {
  deal: Deal
  gradeName: string
  t: Dict
  viewer: { id: string; isAdmin: boolean }
  parties: InvoiceParty[]
  messages: DealMessage[]
  events: DealEvent[]
  supportPhone: string
}) {
  const d = t.deals
  const seller = parties.find((p) => p.party === 'seller')
  const buyer = parties.find((p) => p.party === 'buyer')
  const isSeller = deal.seller_id === viewer.id
  const isBuyer = deal.buyer_id === viewer.id
  const open = !['completed', 'cancelled'].includes(deal.status)
  const canEdit = (isBuyer || viewer.isAdmin) && open
  const canPay = (isBuyer || (viewer.isAdmin && !deal.buyer_id)) && open
  const canConfirm = (isSeller || viewer.isAdmin) && open
  const unit = t.units[deal.unit]
  const weighed = deal.final_amount !== null
  const money = invoiceTotals(deal, seller?.gstin ?? null, buyer?.gstin ?? null)
  const stepIndex = STEPS.indexOf(deal.status)
  const nameOf = (id: string) => (id === viewer.id ? d.you : id === deal.seller_id ? d.seller : id === deal.buyer_id ? d.buyer : d.team)

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-6 space-y-4">
      <Link href={viewer.isAdmin ? '/admin/deals' : '/dashboard'} className="text-sm text-muted hover:text-ink">← {t.common.back}</Link>

      {/* Header + progress */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="tone-green icon-tile size-12"><Icon name="check" size={24} /></span>
          <div className="flex-1 min-w-[11rem]">
            <h1 className="font-display font-extrabold text-2xl leading-tight">{gradeName}</h1>
            <p className="text-sm text-muted">
              {deal.origin === 'auction' ? d.auction : d.rateCard} · {dateTime(deal.created_at)}
              {deal.invoice_no && <> · {d.invoice} <span className="tabular">{deal.invoice_no}</span></>}
            </p>
          </div>
          <StatusPill status={deal.status} label={d.status[deal.status]} />
        </div>

        {deal.status !== 'cancelled' && (
          <ol className="mt-5 grid grid-cols-5 gap-1">
            {STEPS.map((s, i) => {
              const done = i < stepIndex || deal.status === 'completed'
              const current = i === stepIndex && deal.status !== 'completed'
              return (
                <li key={s} className="text-center">
                  <div className={`h-2 rounded-full ${done ? 'bg-up' : current ? 'bg-accent' : 'bg-line'}`} />
                  <span className={`mt-2 mx-auto grid place-items-center size-7 rounded-full text-xs font-bold ${done ? 'bg-ok-soft text-up' : current ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={`block mt-1 text-[11px] leading-tight ${current ? 'font-semibold text-ink' : 'text-muted'}`}>{d.status[s]}</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {/* Money */}
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="tone-blue icon-tile size-8"><Icon name="rupee" size={17} /></span>
              {d.agreedRate}: <span className="tabular">{rupees(deal.agreed_rate)}/{unit}</span>
            </h2>
            <dl className="divide-y divide-line">
              {deal.est_quantity && <Fact label={d.estQty} value={`${num(deal.est_quantity)} ${t.units[deal.quantity_unit]}`} />}
              {deal.pickup_date && <Fact label={d.pickupDate} value={shortDate(deal.pickup_date)} />}
              {deal.final_weight_kg !== null && <Fact label={d.finalWeight} value={num(deal.final_weight_kg)} />}
              {Number(deal.deduction_amount) > 0 && (
                <Fact label={d.deductions} value={`− ${rupees(deal.deduction_amount)}${deal.deduction_note ? ` (${deal.deduction_note})` : ''}`} />
              )}
              {weighed && money.taxed && <Fact label={d.taxable} value={rupees(money.taxable)} />}
              {weighed && money.taxed && <Fact label={`${d.gst} ${money.percent}%`} value={`+ ${rupees(money.gst)}`} />}
              {weighed && (
                <div className="flex justify-between items-center gap-4 px-4 py-4 bg-ok-soft">
                  <dt className="font-semibold">{d.total}</dt>
                  <dd className="font-display font-extrabold text-2xl tabular text-up">{rupees(money.total)}</dd>
                </div>
              )}
              {viewer.isAdmin && (
                <div className="flex justify-between items-center gap-4 px-4 py-3 bg-[#efe8ff] text-[#5b21b6]">
                  <dt className="text-sm font-semibold flex items-center gap-2"><Icon name="shield" size={16} /> Platform fee {Number(deal.commission_percent)}% (admin only)</dt>
                  <dd className="font-display font-bold tabular">{weighed ? rupees(deal.commission_amount) : '—'}</dd>
                </div>
              )}
            </dl>
            <div className="p-4 flex flex-wrap gap-2 border-t border-line">
              {deal.invoice_no && (
                <Link href={`/deals/${deal.id}/invoice`} className="btn btn-ghost btn-sm"><Icon name="inbox" size={16} /> {d.viewInvoice}</Link>
              )}
              {deal.weighbridge_slip && (
                <a href={deal.weighbridge_slip} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Icon name="scale" size={16} /> {d.slip}</a>
              )}
              {deal.lot_id && <Link href={`/lots/${deal.lot_id}`} className="btn btn-ghost btn-sm"><Icon name="gavel" size={16} /> {d.auction}</Link>}
            </div>
          </section>

          {/* Payment */}
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="tone-green icon-tile size-8"><Icon name="coins" size={17} /></span>
              {d.payment}
            </h2>
            <div className="p-4 space-y-3 text-sm">
              {deal.status === 'completed' ? (
                <p className="rounded-lg bg-ok-soft text-up font-semibold p-3">✓ {d.paidDone}</p>
              ) : !weighed ? (
                <p className="text-muted">{d.payAfterWeigh}</p>
              ) : deal.paid_at ? (
                <>
                  <p className="rounded-lg bg-warn-soft p-3">
                    {d.buyerPaid}: <b className="tabular">{deal.payment_ref}</b>
                    {deal.payment_proof && <> · <a href={deal.payment_proof} target="_blank" rel="noreferrer" className="underline font-semibold">{d.payProof}</a></>}
                  </p>
                  {canConfirm ? (
                    <form action={confirmPayment.bind(null, deal.id)}>
                      <ConfirmButton message={d.confirmAsk} className="btn btn-success w-full">✓ {d.confirmReceived}</ConfirmButton>
                      <p className="hint">{d.confirmAsk}</p>
                    </form>
                  ) : (
                    <p className="text-muted">{d.waitingSeller}</p>
                  )}
                </>
              ) : canPay ? (
                <>
                  <p>{d.payHow}</p>
                  <ActionForm action={recordPayment.bind(null, deal.id)} submitLabel={`${d.iPaid} ${rupees(money.total)}`} submitClass="btn btn-success w-full" className="space-y-3">
                    <div>
                      <label className="label" htmlFor="payment_ref">{d.payRef}</label>
                      <input id="payment_ref" name="payment_ref" className="input tabular" required />
                    </div>
                    <div>
                      <span className="label">{d.payProof} <span className="font-normal text-muted">({t.common.optional})</span></span>
                      <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} max={1} />
                    </div>
                  </ActionForm>
                </>
              ) : (
                <>
                  <p className="text-muted">{d.waitingBuyer}</p>
                  {canConfirm && (
                    <form action={confirmPayment.bind(null, deal.id)}>
                      <ConfirmButton message={d.confirmAsk} className="btn btn-ghost btn-sm">✓ {d.confirmReceived}</ConfirmButton>
                    </form>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Contacts */}
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="tone-purple icon-tile size-8"><Icon name="users" size={17} /></span>
              {d.contacts}
            </h2>
            <ul className="divide-y divide-line">
              {[seller, buyer].filter(Boolean).map((c) => (
                <li key={c!.party} className="px-4 py-3 text-sm">
                  <p className="text-xs text-muted">{c!.party === 'seller' ? d.seller : d.buyer}</p>
                  <p className="font-semibold">{c!.business_name ?? c!.name}</p>
                  {c!.business_name && c!.name && <p>{c!.name}</p>}
                  {c!.phone && (
                    <a href={`tel:+${c!.phone.replace(/^\+/, '')}`} className="inline-flex items-center gap-1 mt-1 btn btn-ghost btn-sm tabular">📞 +{c!.phone.replace(/^\+/, '')}</a>
                  )}
                  {c!.address && <p className="text-muted mt-1">{c!.address}</p>}
                </li>
              ))}
              {!deal.buyer_id && (
                <li className="px-4 py-3 text-sm">
                  <p className="text-xs text-muted">{d.buyer}</p>
                  <p className="font-semibold">{d.brokered}</p>
                  {deal.buyer_billing && viewer.isAdmin && <p className="text-muted whitespace-pre-line">{deal.buyer_billing}</p>}
                  {supportPhone && <a href={`tel:${supportPhone}`} className="inline-flex mt-1 btn btn-ghost btn-sm tabular">📞 {supportPhone}</a>}
                </li>
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          {/* Messages */}
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="tone-orange icon-tile size-8"><Icon name="inbox" size={17} /></span>
              {d.messages}
            </h2>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto bg-bg">
              {messages.length === 0 && <p className="text-sm text-muted text-center py-4">{d.noMessages}</p>}
              {messages.map((m) => {
                const mine = m.sender_id === viewer.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'bg-accent text-white rounded-br-md' : 'bg-surface rounded-bl-md'}`}>
                      <p className={`text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-accent'}`}>{nameOf(m.sender_id)}</p>
                      <p className="whitespace-pre-line break-words">{m.body}</p>
                      <p className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-muted'}`}>{dateTime(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {deal.status !== 'cancelled' && (
              <div className="p-3 border-t border-line">
                <ActionForm action={sendDealMessage.bind(null, deal.id)} submitLabel={d.send} submitClass="btn btn-primary" className="flex gap-2 items-start [&>div:last-child]:shrink-0" key={messages.length}>
                  <input name="body" className="input flex-1" placeholder={d.messageHint} maxLength={2000} required autoComplete="off" aria-label={d.messages} />
                </ActionForm>
                <p className="hint">{d.messagesNote}</p>
              </div>
            )}
          </section>

          {/* Update */}
          {canEdit && (
            <section className="card p-4">
              <h2 className="font-display font-bold mb-3">{d.update}</h2>
              <ActionForm action={updateDeal.bind(null, deal.id)} submitLabel={t.common.save} className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="status">{t.common.status}</label>
                  <select id="status" name="status" className="input" defaultValue={deal.status}>
                    {DEAL_STATUSES.filter((s) => viewer.isAdmin || s !== 'completed').map((s) => <option key={s} value={s}>{d.status[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="pickup_date">{d.pickupDate}</label>
                  <input id="pickup_date" name="pickup_date" type="date" className="input" defaultValue={deal.pickup_date ?? ''} />
                </div>
                <div>
                  <label className="label" htmlFor="final_weight_kg">{d.finalWeight}</label>
                  <input id="final_weight_kg" name="final_weight_kg" type="number" step="any" min="0" inputMode="decimal" className="input tabular" defaultValue={deal.final_weight_kg ?? ''} />
                </div>
                <div>
                  <label className="label" htmlFor="deduction_amount">{d.deductions}</label>
                  <input id="deduction_amount" name="deduction_amount" type="number" step="any" min="0" inputMode="decimal" className="input tabular" defaultValue={deal.deduction_amount || ''} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="deduction_note">{d.deductionNote}</label>
                  <input id="deduction_note" name="deduction_note" className="input" defaultValue={deal.deduction_note ?? ''} />
                </div>
                {viewer.isAdmin && !deal.buyer_id && (
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="buyer_billing">Buyer billing details for the invoice (admin)</label>
                    <textarea id="buyer_billing" name="buyer_billing" className="input" defaultValue={deal.buyer_billing ?? ''} placeholder={'Firm name\nAddress\nGSTIN'} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="label">{d.slip}</span>
                  <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} max={1} />
                </div>
              </ActionForm>
            </section>
          )}

          {/* Timeline */}
          {events.length > 0 && (
            <section className="card p-4">
              <h2 className="font-display font-bold mb-3">{d.timeline}</h2>
              <ol className="relative border-l-2 border-line ml-1.5 space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="pl-4 relative">
                    <span className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-accent" />
                    <p className="text-sm font-medium">{d.status[e.status] ?? e.status}</p>
                    <p className="text-xs text-muted">{dateTime(e.created_at)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular font-medium">{value}</dd>
    </div>
  )
}
