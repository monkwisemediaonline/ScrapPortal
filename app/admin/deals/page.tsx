import Link from 'next/link'
import Icon, { type IconName } from '@/components/Icon'
import StatusPill from '@/components/StatusPill'
import { requireAdmin } from '@/lib/auth'
import { dateTime, num, rupees } from '@/lib/format'
import type { Deal, Grade, Profile } from '@/lib/types'

const FILTERS = ['all', 'open', 'payment_pending', 'completed', 'cancelled'] as const

export default async function AdminDeals({ searchParams }: PageProps<'/admin/deals'>) {
  const { status: q } = await searchParams
  const filter = FILTERS.includes(q as (typeof FILTERS)[number]) ? (q as string) : 'all'
  const { supabase } = await requireAdmin()

  // Totals are over every deal; the table below follows the filter
  const { data: allData } = await supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(1000)
  const all = (allData ?? []) as Deal[]
  const deals = all.filter((d) =>
    filter === 'all' ? true : filter === 'open' ? !['completed', 'cancelled'].includes(d.status) : d.status === filter
  )

  const none = '00000000-0000-0000-0000-000000000000'
  const ids = [...new Set(deals.flatMap((d) => [d.seller_id, d.buyer_id].filter(Boolean) as string[]))].concat(none)
  const [{ data: grades }, { data: people }, { data: sources }, { data: msgs }] = await Promise.all([
    supabase.from('grades').select('id, name_en'),
    supabase.from('profiles').select('id, business_name, public_code, phone').in('id', ids),
    supabase.from('rate_sources').select('id, public_label'),
    supabase.from('deal_messages').select('deal_id').in('deal_id', deals.map((d) => d.id).concat(none)).limit(5000),
  ])
  const g = new Map(((grades ?? []) as Pick<Grade, 'id' | 'name_en'>[]).map((x) => [x.id, x.name_en]))
  const p = new Map(((people ?? []) as Pick<Profile, 'id' | 'business_name' | 'public_code' | 'phone'>[]).map((x) => [x.id, x]))
  const src = new Map((sources ?? []).map((s: { id: string; public_label: string }) => [s.id, s.public_label]))
  const msgCount = new Map<string, number>()
  for (const m of (msgs ?? []) as { deal_id: string }[]) msgCount.set(m.deal_id, (msgCount.get(m.deal_id) ?? 0) + 1)

  const completed = all.filter((d) => d.status === 'completed')
  const live = all.filter((d) => !['completed', 'cancelled'].includes(d.status))
  const sum = (list: Deal[], key: 'final_amount' | 'commission_amount') => list.reduce((a, d) => a + Number(d[key] ?? 0), 0)
  const tiles: { color: string; icon: IconName; label: string; value: string; sub: string }[] = [
    { color: 'grad-blue', icon: 'check', label: 'Value traded (completed)', value: rupees(sum(completed, 'final_amount')), sub: `${completed.length} deals · ${num(completed.reduce((a, d) => a + Number(d.final_weight_kg ?? 0), 0) / 1000)} tonnes` },
    { color: 'grad-green', icon: 'coins', label: 'Platform fee earned', value: rupees(sum(completed, 'commission_amount')), sub: '0.25% of completed deals' },
    { color: 'grad-orange', icon: 'gauge', label: 'In progress', value: rupees(sum(live, 'final_amount')), sub: `${live.length} deals · fee pending ${rupees(sum(live, 'commission_amount'))}` },
    { color: 'grad-purple', icon: 'inbox', label: 'Payments to confirm', value: String(all.filter((d) => d.paid_at && !d.payment_confirmed_at && d.status !== 'cancelled').length), sub: 'Buyer paid, seller not confirmed' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-extrabold text-2xl">Deals &amp; transactions</h1>
        <p className="text-sm text-muted">Every deal on the portal: who sold to whom, the amount, your fee, payment and messages.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`grad ${t.color} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 text-white/85 text-xs font-semibold"><Icon name={t.icon} size={16} /> {t.label}</div>
            <p className="font-display font-extrabold text-2xl tabular mt-2 break-words">{t.value}</p>
            <p className="text-xs text-white/80 mt-1">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/deals?status=${f}`} className={`pill py-1.5 px-3 text-sm capitalize ${filter === f ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}>
            {f.replace('_', ' ')}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table min-w-[900px]">
          <thead>
            <tr><th>Deal</th><th>Seller</th><th>Buyer</th><th className="text-right!">Weight</th><th className="text-right!">Amount</th><th className="text-right!">Fee</th><th>Payment</th><th>Status</th></tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const seller = p.get(d.seller_id)
              const buyer = d.buyer_id ? p.get(d.buyer_id) : null
              const chats = msgCount.get(d.id) ?? 0
              return (
                <tr key={d.id}>
                  <td>
                    <Link href={`/deals/${d.id}`} className="font-semibold text-accent underline">{g.get(d.grade_id)}</Link>
                    <span className="block text-xs text-muted">{d.origin === 'auction' ? 'Auction' : 'Daily rate'} · {dateTime(d.created_at)}</span>
                    <span className="block text-xs text-muted tabular">
                      {d.invoice_no ?? 'No invoice yet'}{chats > 0 && <> · 💬 {chats}</>}
                    </span>
                  </td>
                  <td className="text-sm">
                    {seller?.business_name}
                    <span className="block text-xs text-muted tabular">{seller?.public_code}{seller?.phone ? ` · +${seller.phone}` : ''}</span>
                  </td>
                  <td className="text-sm">
                    {buyer ? (
                      <>
                        {buyer.business_name}
                        <span className="block text-xs text-muted tabular">{buyer.public_code}{buyer.phone ? ` · +${buyer.phone}` : ''}</span>
                      </>
                    ) : (
                      <>
                        <i className="text-muted">Off-portal</i>
                        <span className="block text-xs text-muted">{d.source_id ? src.get(d.source_id) : ''}</span>
                      </>
                    )}
                  </td>
                  <td className="text-right tabular">{d.final_weight_kg !== null ? `${num(d.final_weight_kg)} kg` : '—'}</td>
                  <td className="text-right tabular">
                    {d.final_amount !== null ? rupees(d.final_amount) : '—'}
                    <span className="block text-xs text-muted">{rupees(d.agreed_rate)}/{d.unit}</span>
                  </td>
                  <td className="text-right tabular font-semibold text-[#5b21b6]">{d.final_amount !== null ? rupees(d.commission_amount) : '—'}</td>
                  <td className="text-sm">
                    {d.payment_confirmed_at ? (
                      <span className="text-up font-semibold">✓ Received</span>
                    ) : d.paid_at ? (
                      <span className="text-[#8a6100] font-semibold">Buyer paid</span>
                    ) : (
                      <span className="text-muted">Not paid</span>
                    )}
                    {d.payment_ref && <span className="block text-xs text-muted tabular">{d.payment_ref}</span>}
                  </td>
                  <td><StatusPill status={d.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {deals.length === 0 && <p className="p-6 text-center text-muted">No deals here yet.</p>}
      </div>
    </div>
  )
}
