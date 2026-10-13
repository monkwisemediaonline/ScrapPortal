import Link from 'next/link'
import Icon, { type IconName } from './Icon'
import StatusPill from './StatusPill'

export type AdminCounts = {
  ratesToday: number
  grades: number
  newRequests: number
  pendingMembers: number
  openLots: number
  activeDeals: number
  members: number
  completedDeals: number
}
export type AdminRequestRow = { id: string; grade: string; quantity: string; seller: string; when: string; status: string }
export type AdminMemberRow = { id: string; name: string; role: string; when: string }

/** Admin landing page: what needs doing today, in the order you do it. */
export default function AdminOverview({
  name,
  today,
  counts,
  requests,
  pending,
}: {
  name: string
  today: string
  counts: AdminCounts
  requests: AdminRequestRow[]
  pending: AdminMemberRow[]
}) {
  const ratesDone = counts.ratesToday > 0
  const steps: { n: number; done: boolean; title: string; note: string; href: string; cta: string }[] = [
    { n: 1, done: ratesDone, title: "Post today's rates", note: ratesDone ? `${counts.ratesToday} rates posted today` : 'Not posted yet today', href: '/admin/rates', cta: ratesDone ? 'Update' : 'Post now' },
    { n: 2, done: counts.newRequests === 0, title: 'Handle sell requests', note: counts.newRequests ? `${counts.newRequests} waiting for your call` : 'All handled', href: '/admin/requests', cta: 'Open' },
    { n: 3, done: counts.pendingMembers === 0, title: 'Approve new members', note: counts.pendingMembers ? `${counts.pendingMembers} waiting for approval` : 'No one waiting', href: '/admin/members?status=pending', cta: 'Review' },
    { n: 4, done: counts.activeDeals === 0, title: 'Follow up deals', note: counts.activeDeals ? `${counts.activeDeals} in progress` : 'Nothing in progress', href: '/admin/deals', cta: 'Open' },
  ]
  const tiles: { color: string; icon: IconName; label: string; value: number; href: string }[] = [
    { color: 'grad-green', icon: 'inbox', label: 'Sell requests waiting', value: counts.newRequests, href: '/admin/requests' },
    { color: 'grad-purple', icon: 'users', label: 'Members to approve', value: counts.pendingMembers, href: '/admin/members?status=pending' },
    { color: 'grad-orange', icon: 'gavel', label: 'Open auctions', value: counts.openLots, href: '/admin/lots' },
    { color: 'grad-teal', icon: 'check', label: 'Deals in progress', value: counts.activeDeals, href: '/admin/deals' },
  ]

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="grad grad-purple rounded-2xl p-5 md:p-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="grid place-items-center size-14 rounded-2xl bg-white/20 shrink-0"><Icon name="shield" size={30} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Admin Control Panel</p>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl leading-tight">Welcome, {name}</h1>
            <p className="text-white/80 text-sm mt-0.5">{today} · {counts.members} members · {counts.completedDeals} deals completed</p>
          </div>
        </div>
        <Link href="/admin/rates" className="btn bg-white text-[#6d28d9] hover:bg-white/90">
          <Icon name="rupee" /> {ratesDone ? "Update today's rates" : "Post today's rates"}
        </Link>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`grad ${t.color} big-action min-h-0!`}>
            <div className="flex items-center justify-between">
              <span className="grid place-items-center size-11 rounded-xl bg-white/20"><Icon name={t.icon} size={24} /></span>
              <span className="font-display font-extrabold text-4xl tabular">{t.value}</span>
            </div>
            <span className="font-semibold text-sm">{t.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
        {/* Today's checklist */}
        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 border-b border-line font-display font-bold">Today&apos;s work</h2>
          <ol>
            {steps.map((s) => (
              <li key={s.n} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                <span className={`grid place-items-center size-9 rounded-full font-bold shrink-0 ${s.done ? 'bg-ok-soft text-up' : 'bg-accent text-white'}`}>
                  {s.done ? '✓' : s.n}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{s.title}</span>
                  <span className={`block text-xs ${s.done ? 'text-muted' : 'text-accent font-medium'}`}>{s.note}</span>
                </span>
                <Link href={s.href} className={`btn btn-sm ${s.done ? 'btn-ghost' : 'btn-primary'}`}>{s.cta}</Link>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-4">
          <section className="tone-green card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="icon-tile size-8"><Icon name="inbox" size={17} /></span>
              <span className="flex-1">Latest sell requests</span>
              <Link href="/admin/requests" className="text-xs font-sans font-semibold text-tone">View all →</Link>
            </h2>
            {requests.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted text-center">No sell requests waiting.</p>
            ) : (
              <ul>
                {requests.map((r) => (
                  <li key={r.id} className="border-b border-line last:border-0">
                    <Link href="/admin/requests" className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                      <span className="flex-1 min-w-0">
                        <b>{r.grade}</b> · <span className="tabular">{r.quantity}</span>
                        <span className="block text-xs text-muted truncate">{r.seller} · {r.when}</span>
                      </span>
                      <StatusPill status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tone-purple card overflow-hidden">
            <h2 className="px-4 py-3 border-b border-line font-display font-bold flex items-center gap-2.5">
              <span className="icon-tile size-8"><Icon name="users" size={17} /></span>
              <span className="flex-1">Waiting for approval</span>
              <Link href="/admin/members?status=pending" className="text-xs font-sans font-semibold text-tone">View all →</Link>
            </h2>
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted text-center">No members waiting.</p>
            ) : (
              <ul>
                {pending.map((m) => (
                  <li key={m.id} className="border-b border-line last:border-0">
                    <Link href="/admin/members?status=pending" className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                      <span className="flex-1 min-w-0">
                        <b>{m.name}</b>
                        <span className="block text-xs text-muted capitalize">{m.role} · {m.when}</span>
                      </span>
                      <span className="btn btn-primary btn-sm">Review</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
