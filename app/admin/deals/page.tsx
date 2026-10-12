import Link from 'next/link'
import StatusPill from '@/components/StatusPill'
import { requireAdmin } from '@/lib/auth'
import { dateTime, num, rupees } from '@/lib/format'
import type { Deal, Grade, Profile } from '@/lib/types'

export default async function AdminDeals() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(200)
  const deals = (data ?? []) as Deal[]
  const ids = deals.flatMap((d) => [d.seller_id, d.buyer_id].filter(Boolean) as string[]).concat('00000000-0000-0000-0000-000000000000')

  const [{ data: grades }, { data: people }] = await Promise.all([
    supabase.from('grades').select('id, name_en'),
    supabase.from('profiles').select('id, business_name').in('id', ids),
  ])
  const g = new Map(((grades ?? []) as Pick<Grade, 'id' | 'name_en'>[]).map((x) => [x.id, x.name_en]))
  const p = new Map(((people ?? []) as Pick<Profile, 'id' | 'business_name'>[]).map((x) => [x.id, x.business_name]))

  const completed = deals.filter((d) => d.status === 'completed')
  const tonnes = completed.reduce((a, d) => a + Number(d.final_weight_kg ?? 0), 0) / 1000
  const value = completed.reduce((a, d) => a + Number(d.final_amount ?? 0), 0)

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl">Deals</h1>
      <p className="text-sm text-muted mb-4 tabular">
        Completed: {completed.length} deals · {num(tonnes)} tonnes · {rupees(value)} traded
      </p>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Deal</th><th>Seller → Buyer</th><th>Rate</th><th>Final</th><th>Status</th></tr></thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/deals/${d.id}`} className="font-medium underline">{g.get(d.grade_id)}</Link>
                  <span className="block text-xs text-muted">{d.origin === 'auction' ? 'Auction' : 'Rate card'} · {dateTime(d.created_at)}</span>
                </td>
                <td className="text-sm">{p.get(d.seller_id)} → {d.buyer_id ? p.get(d.buyer_id) : <i className="text-muted">off-platform</i>}</td>
                <td className="tabular">{rupees(d.agreed_rate)}/{d.unit}</td>
                <td className="tabular">{d.final_amount !== null ? rupees(d.final_amount) : '—'}</td>
                <td><StatusPill status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {deals.length === 0 && <p className="p-6 text-center text-muted">No deals yet.</p>}
      </div>
    </div>
  )
}
