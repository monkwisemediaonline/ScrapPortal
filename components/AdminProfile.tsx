import Link from 'next/link'
import Icon, { type IconName } from './Icon'
import { APP_NAME } from '@/lib/config'
import { shortDate } from '@/lib/format'
import type { Profile } from '@/lib/types'

/** The administrator's own profile: who they are and what they control. */
export default function AdminProfile({
  profile,
  stats,
}: {
  profile: Profile
  stats: { members: number; deals: number; feeEarned: string }
}) {
  const phone = profile.phone ? '+' + profile.phone.replace(/^\+/, '') : 'Not set'
  const details: [string, string][] = [
    ['Name', profile.full_name ?? '—'],
    ['Organisation', profile.business_name ?? '—'],
    ['Email (login)', profile.email ?? '—'],
    ['Mobile', phone],
    ['GSTIN', profile.gstin ?? 'Not set'],
    ['Address', [profile.area, profile.address].filter(Boolean).join(' · ') || 'Not set'],
    ['Member ID', profile.public_code],
    ['Admin since', shortDate(profile.created_at) + ' ' + profile.created_at.slice(0, 4)],
  ]
  const powers: { icon: IconName; text: string }[] = [
    { icon: 'rupee', text: 'Post and change daily rates' },
    { icon: 'users', text: 'Approve, suspend and edit members' },
    { icon: 'check', text: 'See and update every deal and its messages' },
    { icon: 'coins', text: 'See all money, set the platform fee, mark fees collected' },
    { icon: 'grid', text: 'Manage scrap types and rate sources' },
  ]
  const shortcuts: { href: string; icon: IconName; label: string; color: string }[] = [
    { href: '/admin', icon: 'gauge', label: 'Admin dashboard', color: 'grad-purple' },
    { href: '/admin/finance', icon: 'coins', label: 'Finance', color: 'grad-green' },
    { href: '/admin/deals', icon: 'check', label: 'All deals', color: 'grad-blue' },
    { href: '/admin/members', icon: 'users', label: 'Members', color: 'grad-orange' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-6 space-y-5">
      {/* Identity */}
      <div className="grad grad-purple rounded-2xl p-5 md:p-6 flex flex-wrap items-center gap-5">
        <span className="grid place-items-center size-20 rounded-full bg-white text-[#6d28d9] font-display font-extrabold text-3xl shrink-0">
          {(profile.full_name ?? 'A').trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-[12rem]">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Icon name="shield" size={14} /> Administrator
          </p>
          <h1 className="font-display font-extrabold text-3xl leading-tight mt-2">{profile.full_name}</h1>
          <p className="text-white/85">{profile.business_name} · runs {APP_NAME}</p>
        </div>
        <Link href="/reset-password" className="btn bg-white text-[#6d28d9] hover:bg-white/90"><Icon name="lock" size={16} /> Change password</Link>
      </div>

      {/* Platform at a glance */}
      <div className="grid grid-cols-3 gap-3">
        {([['Members', String(stats.members)], ['Deals so far', String(stats.deals)], ['Fee earned', stats.feeEarned]] as const).map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <p className="font-display font-extrabold text-2xl tabular break-words">{value}</p>
            <p className="text-xs text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <section className="tone-purple card overflow-hidden">
          <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
            <span className="icon-tile size-8"><Icon name="user" size={17} /></span>
            My details
          </h2>
          <dl className="divide-y divide-line">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted shrink-0">{label}</dt>
                <dd className="font-medium text-right break-words min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-4">
          <section className="tone-green card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="icon-tile size-8"><Icon name="shield" size={17} /></span>
              What you can do as admin
            </h2>
            <ul className="divide-y divide-line">
              {powers.map((p) => (
                <li key={p.text} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-up shrink-0"><Icon name={p.icon} /></span>
                  {p.text}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-2 gap-3">
            {shortcuts.map((s) => (
              <Link key={s.href} href={s.href} className={`grad ${s.color} big-action min-h-0! flex-row! items-center`}>
                <span className="grid place-items-center size-10 rounded-xl bg-white/20 shrink-0"><Icon name={s.icon} size={20} /></span>
                <span className="font-semibold text-sm">{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        To sell or bid yourself, use <Link href="/sell" className="text-accent font-semibold underline">Sell scrap</Link> and{' '}
        <Link href="/lots" className="text-accent font-semibold underline">Auctions</Link> in the Marketplace menu. Your own trades are listed below.
      </p>
    </div>
  )
}
