import Link from 'next/link'
import LotStatus from '@/components/LotStatus'
import { requireAdmin } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import { dateTime, num, rupees } from '@/lib/format'
import type { Grade, Lot, Profile } from '@/lib/types'

export default async function AdminLots() {
  const { supabase } = await requireAdmin()
  const { t } = await getDict()
  const { data } = await supabase.from('lots').select('*').order('created_at', { ascending: false }).limit(100)
  const lots = (data ?? []) as Lot[]

  const [{ data: grades }, { data: sellers }, summaries] = await Promise.all([
    supabase.from('grades').select('id, name_en'),
    supabase.from('profiles').select('id, business_name, public_code').in('id', lots.map((l) => l.seller_id).concat('00000000-0000-0000-0000-000000000000')),
    Promise.all(lots.map(async (l) => (await supabase.rpc('lot_bid_summary', { p_lot_id: l.id })).data?.[0] as { top_rate: number | null; bid_count: number } | undefined)),
  ])
  const g = new Map(((grades ?? []) as Pick<Grade, 'id' | 'name_en'>[]).map((x) => [x.id, x.name_en]))
  const s = new Map(((sellers ?? []) as Pick<Profile, 'id' | 'business_name' | 'public_code'>[]).map((x) => [x.id, x]))

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-4">Auctions</h1>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Lot</th><th>Seller</th><th>Bids</th><th>Top</th><th>Closes</th><th>Status</th></tr></thead>
          <tbody>
            {lots.map((l, i) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/lots/${l.id}`} className="font-medium underline">{l.title}</Link>
                  <span className="block text-xs text-muted">{g.get(l.grade_id)} · {num(l.quantity)} {l.quantity_unit}</span>
                </td>
                <td className="text-sm">{s.get(l.seller_id)?.business_name} <span className="text-xs text-muted">{s.get(l.seller_id)?.public_code}</span></td>
                <td className="tabular">{summaries[i]?.bid_count ?? 0}</td>
                <td className="tabular">{summaries[i]?.top_rate ? `${rupees(summaries[i]!.top_rate)}/${l.price_unit}` : '—'}</td>
                <td className="text-sm">{dateTime(l.closes_at)}</td>
                <td><LotStatus lot={l} t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lots.length === 0 && <p className="p-6 text-center text-muted">No auctions yet.</p>}
      </div>
    </div>
  )
}
