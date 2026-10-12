import Link from 'next/link'
import ActionForm from '@/components/ActionForm'
import StatusPill from '@/components/StatusPill'
import { convertRequest, setRequestStatus } from '@/app/actions/admin'
import { requireAdmin } from '@/lib/auth'
import { dateTime, num, rupees } from '@/lib/format'
import type { Grade, Profile, RateSource, SellRequest } from '@/lib/types'

const FILTERS = ['open', 'converted', 'rejected', 'cancelled', 'all'] as const

export default async function AdminRequests({ searchParams }: PageProps<'/admin/requests'>) {
  const { status: q } = await searchParams
  const filter = FILTERS.includes(q as (typeof FILTERS)[number]) ? (q as string) : 'open'
  const { supabase } = await requireAdmin()

  let query = supabase.from('sell_requests').select('*').order('created_at', { ascending: false }).limit(100)
  if (filter === 'open') query = query.in('status', ['new', 'contacted'])
  else if (filter !== 'all') query = query.eq('status', filter)
  const { data } = await query
  const requests = (data ?? []) as SellRequest[]

  const [{ data: grades }, { data: sellers }, { data: sources }, { data: priv }] = await Promise.all([
    supabase.from('grades').select('*'),
    supabase.from('profiles').select('*').in('id', requests.map((r) => r.seller_id).concat('00000000-0000-0000-0000-000000000000')),
    supabase.from('rate_sources').select('*').eq('active', true),
    supabase.from('rate_source_private').select('*'),
  ])
  const g = new Map(((grades ?? []) as Grade[]).map((x) => [x.id, x]))
  const s = new Map(((sellers ?? []) as Profile[]).map((x) => [x.id, x]))
  const src = (sources ?? []) as RateSource[]
  const srcBy = new Map(src.map((x) => [x.id, x]))
  const privBy = new Map((priv ?? []).map((x: { source_id: string; phone: string | null; contact_name: string | null }) => [x.source_id, x]))

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl">Sell requests</h1>
      <p className="text-sm text-muted mb-4">
        Sellers who accepted a board rate. Call the buyer (source) to confirm, call the seller, then convert to a deal.
      </p>
      <div className="flex gap-1 overflow-x-auto mb-4">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/requests?status=${f}`} className={`pill py-1.5 px-3 text-sm capitalize ${filter === f ? 'bg-steel text-white' : 'bg-surface border border-line'}`}>
            {f}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-muted">Nothing to handle.</div>
      ) : (
        <div className="grid gap-3">
          {requests.map((r) => {
            const seller = s.get(r.seller_id)
            const grade = g.get(r.grade_id)
            const source = r.source_id ? srcBy.get(r.source_id) : null
            const sp = r.source_id ? privBy.get(r.source_id) : null
            const open = ['new', 'contacted'].includes(r.status)
            return (
              <div key={r.id} className="card p-4 grid lg:grid-cols-[1.2fr_1fr] gap-4">
                <div className="text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-base">{grade?.name_en}</b>
                    <span className="tabular">· {num(r.quantity)} {r.quantity_unit}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <p>
                    Quoted <b className="tabular">{r.quoted_price ? `${rupees(r.quoted_price)}/${r.unit}` : '—'}</b>
                    {source && <> from {source.public_label}</>}
                    {sp?.phone && <> · <a className="text-accent tabular" href={`tel:${sp.phone}`}>{sp.contact_name ?? 'call'} {sp.phone}</a></>}
                  </p>
                  <p>
                    Seller: <b>{seller?.business_name}</b> ({seller?.full_name}) ·{' '}
                    {seller?.phone && <a className="text-accent tabular" href={`tel:+${seller.phone.replace(/^\+/, '')}`}>+{seller.phone.replace(/^\+/, '')}</a>}{' '}
                    <StatusPill status={seller?.status ?? 'pending'} />
                  </p>
                  <p className="text-muted">{r.area}{r.pickup_address ? ` · ${r.pickup_address}` : ''}</p>
                  {r.notes && <p>“{r.notes}”</p>}
                  {r.photos.length > 0 && (
                    <div className="flex gap-1 pt-1">
                      {r.photos.map((p) => (
                        <a key={p} href={p} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p} alt="" className="size-14 rounded object-cover border border-line" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted">{dateTime(r.created_at)}</p>
                  {open && (
                    <div className="flex gap-2 pt-2">
                      {r.status === 'new' && (
                        <form action={setRequestStatus.bind(null, r.id, 'contacted')}><button className="btn btn-ghost btn-sm">Mark contacted</button></form>
                      )}
                      <form action={setRequestStatus.bind(null, r.id, 'rejected')}><button className="btn btn-ghost btn-sm">Decline</button></form>
                    </div>
                  )}
                  {r.deal_id && <Link href={`/deals/${r.deal_id}`} className="text-accent font-semibold underline">Open deal →</Link>}
                </div>

                {open && (
                  <div className="rounded-lg bg-bg p-3">
                    <p className="font-semibold text-sm mb-2">Convert to deal</p>
                    <ActionForm action={convertRequest.bind(null, r.id)} submitLabel="Create deal" className="space-y-2">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input name="agreed_rate" type="number" step="0.01" min="0" required defaultValue={r.quoted_price ?? ''} placeholder="Agreed rate" className="input min-h-9! py-1! tabular" />
                        <select name="unit" defaultValue={r.unit} className="input min-h-9! py-1!">
                          <option value="kg">/kg</option>
                          <option value="tonne">/tonne</option>
                          <option value="piece">/piece</option>
                        </select>
                      </div>
                      <select name="source_id" defaultValue={r.source_id ?? ''} className="input min-h-9! py-1! text-sm">
                        <option value="">— buyer source —</option>
                        {src.map((x) => <option key={x.id} value={x.id}>{x.public_label}</option>)}
                      </select>
                      <input name="buyer_code" placeholder="Buyer member ID if on portal (e.g. LSX-1004)" className="input min-h-9! py-1! text-sm" />
                      <input name="admin_note" placeholder="Note" className="input min-h-9! py-1! text-sm" />
                    </ActionForm>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
