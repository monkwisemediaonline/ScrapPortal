import Link from 'next/link'
import { notFound } from 'next/navigation'
import ActionForm from '@/components/ActionForm'
import PhotoInput from '@/components/PhotoInput'
import StatusPill from '@/components/StatusPill'
import { updateDeal } from '@/app/actions/member'
import { requireMember } from '@/lib/auth'
import { SUPPORT_PHONE } from '@/lib/config'
import { getDict, localName } from '@/lib/i18n'
import { dateTime, num, rupees, shortDate } from '@/lib/format'
import { DEAL_STATUSES, type Deal, type Grade } from '@/lib/types'

type Contact = { party: 'seller' | 'buyer'; name: string | null; business_name: string | null; phone: string | null; address: string | null }

export default async function DealPage({ params }: PageProps<'/deals/[id]'>) {
  const { id } = await params
  const { supabase, profile } = await requireMember()
  const { t, locale } = await getDict()
  const d = t.deals

  const { data: deal } = await supabase.from('deals').select('*').eq('id', id).maybeSingle<Deal>()
  if (!deal) notFound()

  const [{ data: grade }, { data: contacts }, { data: events }] = await Promise.all([
    supabase.from('grades').select('*').eq('id', deal.grade_id).single<Grade>(),
    supabase.rpc('deal_contacts', { p_deal_id: deal.id }),
    supabase.from('deal_events').select('*').eq('deal_id', deal.id).order('created_at'),
  ])
  const canEdit = (deal.buyer_id === profile.id || profile.role === 'admin') && !['completed', 'cancelled'].includes(deal.status)
  const unit = t.units[deal.unit]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-muted hover:text-ink">← {t.nav.dashboard}</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <h1 className="font-display font-extrabold text-3xl">{localName(grade, locale)}</h1>
        <StatusPill status={deal.status} label={d.status[deal.status]} />
      </div>
      <p className="text-sm text-muted mt-1">
        {deal.origin === 'auction' ? d.auction : d.rateCard} · {dateTime(deal.created_at)}
        {deal.lot_id && <> · <Link href={`/lots/${deal.lot_id}`} className="underline">#{deal.lot_id.slice(0, 8)}</Link></>}
      </p>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <dl className="card divide-y divide-line">
          <Fact label={d.agreedRate} value={`${rupees(deal.agreed_rate)}/${unit}`} strong />
          {deal.est_quantity && <Fact label={d.estQty} value={`${num(deal.est_quantity)} ${t.units[deal.quantity_unit]}`} />}
          {deal.pickup_date && <Fact label={d.pickupDate} value={shortDate(deal.pickup_date)} />}
          {deal.final_weight_kg !== null && <Fact label={d.finalWeight} value={num(deal.final_weight_kg)} />}
          {Number(deal.deduction_amount) > 0 && (
            <Fact label={d.deductions} value={`${rupees(deal.deduction_amount)}${deal.deduction_note ? ` (${deal.deduction_note})` : ''}`} />
          )}
          {deal.final_amount !== null && <Fact label={d.finalAmount} value={rupees(deal.final_amount)} strong />}
          {deal.weighbridge_slip && (
            <div className="px-4 py-3 text-sm flex justify-between">
              <span className="text-muted">{d.slip}</span>
              <a href={deal.weighbridge_slip} target="_blank" rel="noreferrer" className="text-accent font-semibold underline">View</a>
            </div>
          )}
        </dl>

        <div className="card">
          <h2 className="px-4 py-3 border-b border-line font-semibold">{d.contacts}</h2>
          <ul className="divide-y divide-line">
            {((contacts ?? []) as Contact[]).map((c) => (
              <li key={c.party} className="px-4 py-3 text-sm">
                <p className="text-xs text-muted">{c.party === 'seller' ? d.seller : d.buyer}</p>
                <p className="font-semibold">{c.business_name ?? c.name}</p>
                {c.business_name && c.name && <p>{c.name}</p>}
                {c.phone && <a href={`tel:+${c.phone.replace(/^\+/, '')}`} className="text-accent font-semibold tabular">+{c.phone.replace(/^\+/, '')}</a>}
                {c.address && <p className="text-muted mt-1">{c.address}</p>}
              </li>
            ))}
            {!deal.buyer_id && (
              <li className="px-4 py-3 text-sm">
                <p className="text-xs text-muted">{d.buyer}</p>
                <p className="font-semibold">{d.brokered}</p>
                {SUPPORT_PHONE && <a href={`tel:${SUPPORT_PHONE}`} className="text-accent font-semibold tabular">{SUPPORT_PHONE}</a>}
              </li>
            )}
          </ul>
        </div>
      </div>

      {canEdit && (
        <div className="card p-5 mt-4">
          <h2 className="font-semibold mb-4">{d.update}</h2>
          <ActionForm action={updateDeal.bind(null, deal.id)} submitLabel={t.common.save} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="status">{t.common.status}</label>
              <select id="status" name="status" className="input" defaultValue={deal.status}>
                {DEAL_STATUSES.map((s) => <option key={s} value={s}>{d.status[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pickup_date">{d.pickupDate}</label>
              <input id="pickup_date" name="pickup_date" type="date" className="input" defaultValue={deal.pickup_date ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="final_weight_kg">{d.finalWeight}</label>
              <input id="final_weight_kg" name="final_weight_kg" type="number" step="any" min="0" className="input tabular" defaultValue={deal.final_weight_kg ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="deduction_amount">{d.deductions}</label>
              <input id="deduction_amount" name="deduction_amount" type="number" step="any" min="0" className="input tabular" defaultValue={deal.deduction_amount || ''} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="deduction_note">{d.deductionNote}</label>
              <input id="deduction_note" name="deduction_note" className="input" defaultValue={deal.deduction_note ?? ''} />
            </div>
            <div className="sm:col-span-2">
              <span className="label">{d.slip}</span>
              <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} max={1} />
            </div>
          </ActionForm>
        </div>
      )}

      {!!events?.length && (
        <div className="card p-5 mt-4">
          <h2 className="font-semibold mb-3">{d.timeline}</h2>
          <ol className="relative border-l-2 border-line ml-1.5 space-y-3">
            {(events as { id: number; status: Deal['status']; created_at: string }[]).map((e) => (
              <li key={e.id} className="pl-4 relative">
                <span className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-accent" />
                <p className="text-sm font-medium">{d.status[e.status] ?? e.status}</p>
                <p className="text-xs text-muted">{dateTime(e.created_at)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right tabular ${strong ? 'font-display font-bold text-base' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}
