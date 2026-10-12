import type { Metadata } from 'next'
import Link from 'next/link'
import Icon, { type IconName } from '@/components/Icon'
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

  const tiles: { label: string; value: number; sub?: string; href: string; urgent?: boolean; tone: string; icon: IconName }[] = [
    { label: 'Rates posted today', value: ratesToday, sub: `${grades} active grades`, href: '/admin/rates', urgent: ratesToday === 0, tone: 'tone-blue', icon: 'rupee' },
    { label: 'Sell requests to handle', value: newRequests, href: '/admin/requests', urgent: newRequests > 0, tone: 'tone-green', icon: 'inbox' },
    { label: 'Members awaiting approval', value: pendingMembers, href: '/admin/members?status=pending', urgent: pendingMembers > 0, tone: 'tone-purple', icon: 'users' },
    { label: 'Open auctions', value: openLots, href: '/admin/lots', tone: 'tone-orange', icon: 'gavel' },
    { label: 'Deals in progress', value: activeDeals, href: '/admin/deals', tone: 'tone-teal', icon: 'check' },
  ]

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-5">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`${t.tone} card p-5 flex items-start gap-4 hover:shadow-md transition-shadow`}>
            <span className="icon-tile size-12"><Icon name={t.icon} size={24} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted">{t.label}</p>
              <p className="font-display font-extrabold text-3xl tabular mt-0.5">{t.value}</p>
              {t.sub && <p className="text-xs text-muted mt-1">{t.sub}</p>}
            </div>
            {t.urgent && <span className="pill bg-tone text-white">Action</span>}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted mt-6">
        Daily routine: post today&apos;s rates → call new sell requests → approve members → follow up open deals.
      </p>
    </div>
  )
}
