import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/rates', label: 'Daily rates' },
  { href: '/admin/requests', label: 'Sell requests' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/lots', label: 'Auctions' },
  { href: '/admin/deals', label: 'Deals' },
  { href: '/admin/sources', label: 'Rate sources' },
  { href: '/admin/catalog', label: 'Catalog' },
]

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin()
  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-6">
      {/* Phones only; on desktop these links live in the sidebar */}
      <nav className="lg:hidden flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-line [scrollbar-width:none]">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-surface border border-line">
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
