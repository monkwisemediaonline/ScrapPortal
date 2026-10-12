import Link from 'next/link'
import StatusPill from '@/components/StatusPill'
import { setMemberStatus, updateMember } from '@/app/actions/admin'
import { requireAdmin } from '@/lib/auth'
import { dateTime } from '@/lib/format'
import type { Profile } from '@/lib/types'

const FILTERS = ['pending', 'approved', 'rejected', 'suspended', 'incomplete', 'all'] as const

export default async function AdminMembers({ searchParams }: PageProps<'/admin/members'>) {
  const { status: q } = await searchParams
  const status = FILTERS.includes(q as (typeof FILTERS)[number]) ? (q as string) : 'pending'
  const { supabase } = await requireAdmin()

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
  if (status !== 'all') query = query.eq('status', status)
  const { data } = await query
  const members = (data ?? []) as Profile[]

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl">Members</h1>
      <p className="text-sm text-muted mb-4">Verify business details (GSTIN, a call or visit) before approving. Approved sellers can auction lots; approved buyers can bid.</p>
      <div className="flex gap-1 overflow-x-auto mb-4">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/members?status=${f}`} className={`pill py-1.5 px-3 text-sm capitalize ${status === f ? 'bg-steel text-white' : 'bg-surface border border-line'}`}>
            {f}
          </Link>
        ))}
      </div>
      {members.length === 0 ? (
        <div className="card p-8 text-center text-muted">No members here.</div>
      ) : (
        <div className="grid gap-3">
          {members.map((m) => (
            <div key={m.id} className="card p-4 grid md:grid-cols-[1.4fr_1fr_auto] gap-4">
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-base">{m.business_name ?? '—'}</b>
                  <StatusPill status={m.status} />
                  <span className="text-xs text-muted tabular">{m.public_code}</span>
                </div>
                <p className="mt-1">{m.full_name} · <span className="capitalize">{m.role}</span></p>
                <p className="tabular">
                  {m.phone && <a className="text-accent" href={`tel:+${m.phone.replace(/^\+/, '')}`}>+{m.phone.replace(/^\+/, '')}</a>}
                  {m.email && <span className="text-muted"> {m.email}</span>}
                </p>
                <p className="text-muted">GSTIN: <span className="tabular">{m.gstin ?? '—'}</span></p>
                <p className="text-muted">{m.area}{m.address ? ` · ${m.address}` : ''}</p>
                <p className="text-xs text-muted mt-1">Joined {dateTime(m.created_at)}</p>
              </div>
              <form action={updateMember.bind(null, m.id)} className="space-y-2">
                <select name="role" defaultValue={m.role} className="input min-h-9! py-1! text-sm">
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="both">Both</option>
                  <option value="admin">Admin</option>
                </select>
                <textarea name="admin_note" defaultValue={m.admin_note ?? ''} placeholder="Private note (verification, visit…)" className="input min-h-16! text-sm" />
                <button className="btn btn-ghost btn-sm">Save</button>
              </form>
              <div className="flex md:flex-col gap-2">
                {m.status !== 'approved' && (
                  <form action={setMemberStatus.bind(null, m.id, 'approved')}><button className="btn btn-primary btn-sm w-full">Approve</button></form>
                )}
                {m.status === 'pending' && (
                  <form action={setMemberStatus.bind(null, m.id, 'rejected')}><button className="btn btn-ghost btn-sm w-full">Reject</button></form>
                )}
                {m.status === 'approved' && m.role !== 'admin' && (
                  <form action={setMemberStatus.bind(null, m.id, 'suspended')}><button className="btn btn-ghost btn-sm w-full">Suspend</button></form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
