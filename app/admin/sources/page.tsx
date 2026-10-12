import ActionForm from '@/components/ActionForm'
import StatusPill from '@/components/StatusPill'
import { createSource, linkSourceBuyer, toggleSource } from '@/app/actions/admin'
import { requireAdmin } from '@/lib/auth'
import type { RateSource } from '@/lib/types'

type Private = { source_id: string; contact_name: string | null; phone: string | null; notes: string | null }

export default async function AdminSources() {
  const { supabase } = await requireAdmin()
  const [{ data: sources }, { data: priv }, { data: buyers }] = await Promise.all([
    supabase.from('rate_sources').select('*').order('created_at'),
    supabase.from('rate_source_private').select('*'),
    supabase.from('profiles').select('id, public_code, business_name').in('role', ['buyer', 'both']).eq('status', 'approved'),
  ])
  const privBy = new Map(((priv ?? []) as Private[]).map((p) => [p.source_id, p]))
  const buyerBy = new Map((buyers ?? []).map((b) => [b.id, b]))

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
      <div>
        <h1 className="font-display font-extrabold text-2xl">Rate sources</h1>
        <p className="text-sm text-muted mb-4">
          Buyers whose rates you post. The public sees only the label. When a buyer joins the portal, link their member ID so they can post rates themselves later.
        </p>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Public label</th><th>Private contact</th><th>Linked member</th><th /></tr></thead>
            <tbody>
              {((sources ?? []) as RateSource[]).map((s) => {
                const p = privBy.get(s.id)
                const linked = s.buyer_id ? buyerBy.get(s.buyer_id) : null
                return (
                  <tr key={s.id}>
                    <td>
                      <b>{s.public_label}</b>
                      {s.location && <span className="block text-xs text-muted">{s.location}</span>}
                      {!s.active && <StatusPill status="cancelled" label="hidden" />}
                    </td>
                    <td className="text-sm">
                      {p?.contact_name}
                      {p?.phone && <a href={`tel:${p.phone}`} className="block text-accent tabular">{p.phone}</a>}
                      {p?.notes && <span className="block text-xs text-muted">{p.notes}</span>}
                    </td>
                    <td>
                      <form action={linkSourceBuyer.bind(null, s.id)} className="flex gap-1">
                        <input name="public_code" defaultValue={linked?.public_code ?? ''} placeholder="LSX-1001" className="input min-h-8! py-1! w-28 text-sm" />
                        <button className="btn btn-ghost btn-sm">Link</button>
                      </form>
                    </td>
                    <td>
                      <form action={toggleSource.bind(null, s.id, !s.active)}>
                        <button className="text-xs underline text-muted">{s.active ? 'Hide' : 'Show'}</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Add source</h2>
        <ActionForm action={createSource} submitLabel="Add source">
          <div>
            <label className="label" htmlFor="public_label">Public label</label>
            <input id="public_label" name="public_label" className="input" required placeholder="Induction furnace, Mandi Gobindgarh" />
            <p className="hint">Shown on the rate board. Avoid the firm&apos;s name until they agree.</p>
          </div>
          <div>
            <label className="label" htmlFor="location">Location</label>
            <input id="location" name="location" className="input" placeholder="Mandi Gobindgarh" />
          </div>
          <div>
            <label className="label" htmlFor="contact_name">Contact name (private)</label>
            <input id="contact_name" name="contact_name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (private)</label>
            <input id="phone" name="phone" className="input" inputMode="tel" />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes (private)</label>
            <textarea id="notes" name="notes" className="input" />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}
