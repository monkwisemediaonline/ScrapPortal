import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { istToday } from '@/lib/format'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminHome() {
  const { supabase } = await requireAdmin()
  const today = istToday()
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0)

  const [pendingMembers, newRequests, openLots, activeDeals, ratesToday, grades] = await Promise.all([
    count(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    count(supabase.from('sell_requests').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted'])),
    count(supabase.from('lots').select('*', { count: 'exact', head: true }).eq('status', 'open')),
    count(supabase.from('deals').select('*', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)')),
    count(supabase.from('rates').select('*', { count: 'exact', head: true }).eq('rate_date', today)),
    count(supabase.from('grades').select('*', { count: 'exact', head: true }).eq('active', true)),
  ])

  const tiles = [
    { label: "Rates posted today", value: `${ratesToday}`, sub: `${grades} active grades`, href: '/admin/rates', urgent: ratesToday === 0 },
    { label: 'Sell requests to handle', value: newRequests, href: '/admin/requests', urgent: newRequests > 0 },
    { label: 'Members awaiting approval', value: pendingMembers, href: '/admin/members?status=pending', urgent: pendingMembers > 0 },
    { label: 'Open auctions', value: openLots, href: '/admin/lots' },
    { label: 'Deals in progress', value: activeDeals, href: '/admin/deals' },
  ]

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-5">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`card p-5 hover:border-accent ${t.urgent ? 'border-accent' : ''}`}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="font-display font-extrabold text-3xl tabular mt-1">{t.value}</p>
            {t.sub && <p className="text-xs text-muted mt-1">{t.sub}</p>}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted mt-6">
        Daily routine: post today&apos;s rates → call new sell requests → approve members → follow up open deals.
      </p>
    </div>
  )
}
