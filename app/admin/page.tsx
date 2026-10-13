import type { Metadata } from 'next'
import AdminOverview from '@/components/AdminOverview'
import { requireAdmin } from '@/lib/auth'
import { dateTime, istToday, num, shortDate } from '@/lib/format'
import type { Grade, Profile, SellRequest } from '@/lib/types'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin()
  const today = istToday()
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0)
  const head = { count: 'exact' as const, head: true }

  const [pendingMembers, newRequests, openLots, activeDeals, completedDeals, ratesToday, grades, members, { data: reqData }, { data: pendingData }] =
    await Promise.all([
      count(supabase.from('profiles').select('*', head).eq('status', 'pending')),
      count(supabase.from('sell_requests').select('*', head).in('status', ['new', 'contacted'])),
      count(supabase.from('lots').select('*', head).eq('status', 'open')),
      count(supabase.from('deals').select('*', head).not('status', 'in', '(completed,cancelled)')),
      count(supabase.from('deals').select('*', head).eq('status', 'completed')),
      count(supabase.from('rates').select('*', head).eq('rate_date', today)),
      count(supabase.from('grades').select('*', head).eq('active', true)),
      count(supabase.from('profiles').select('*', head).neq('status', 'incomplete')),
      supabase.from('sell_requests').select('*').in('status', ['new', 'contacted']).order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    ])

  const reqs = (reqData ?? []) as SellRequest[]
  const none = '00000000-0000-0000-0000-000000000000'
  const [{ data: gradeRows }, { data: sellerRows }] = await Promise.all([
    supabase.from('grades').select('id, name_en').in('id', reqs.map((r) => r.grade_id).concat(none)),
    supabase.from('profiles').select('id, business_name').in('id', reqs.map((r) => r.seller_id).concat(none)),
  ])
  const gradeName = new Map(((gradeRows ?? []) as Pick<Grade, 'id' | 'name_en'>[]).map((g) => [g.id, g.name_en]))
  const sellerName = new Map(((sellerRows ?? []) as Pick<Profile, 'id' | 'business_name'>[]).map((s) => [s.id, s.business_name]))

  return (
    <AdminOverview
      name={profile.full_name?.split(' ')[0] ?? 'Admin'}
      today={shortDate(today)}
      counts={{ ratesToday, grades, newRequests, pendingMembers, openLots, activeDeals, members, completedDeals }}
      requests={reqs.map((r) => ({
        id: r.id,
        grade: gradeName.get(r.grade_id) ?? 'Scrap',
        quantity: `${num(r.quantity)} ${r.quantity_unit}`,
        seller: sellerName.get(r.seller_id) ?? '',
        when: dateTime(r.created_at),
        status: r.status,
      }))}
      pending={((pendingData ?? []) as Profile[]).map((m) => ({
        id: m.id,
        name: m.business_name ?? m.full_name ?? '—',
        role: m.role,
        when: dateTime(m.created_at),
      }))}
    />
  )
}
