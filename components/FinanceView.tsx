import Link from 'next/link'
import ActionForm from './ActionForm'
import Icon, { type IconName } from './Icon'
import StatusPill from './StatusPill'
import { markFeeReceived, setFeeRate, unmarkFeeReceived } from '@/app/actions/admin'
import { dateTime, num, rupees, shortDate } from '@/lib/format'
import { financeSummary, RANGES, type FinanceRow, type Range } from '@/lib/finance'

const RANGE_LABEL: Record<Range, string> = { today: 'Today', '7d': 'Last 7 days', month: 'This month', all: 'All time' }

/** Admin finance: earnings, day-by-day totals and a line for every transaction. */
export default function FinanceView({ rows, range, feeRate }: { rows: FinanceRow[]; range: Range; feeRate: number }) {
  const s = financeSummary(rows)
  const tiles: { color: string; icon: IconName; label: string; value: string; sub: string }[] = [
    { color: 'grad-blue', icon: 'chart', label: 'Value traded', value: rupees(s.traded), sub: `${s.deals} deals · GST billed ${rupees(s.gst)}` },
    { color: 'grad-green', icon: 'coins', label: 'Your fee earned', value: rupees(s.feeEarned), sub: 'On completed deals' },
    { color: 'grad-teal', icon: 'check', label: 'Fee collected', value: rupees(s.feeCollected), sub: 'Marked as received by you' },
    { color: 'grad-orange', icon: 'inbox', label: 'Fee still to collect', value: rupees(s.feeToCollect), sub: `Plus ${rupees(s.feeUpcoming)} on deals in progress` },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl">Finance</h1>
          <p className="text-sm text-muted">Your earnings and every rupee moving through the portal.</p>
        </div>
        <a href={`/admin/finance/export?range=${range}`} className="btn btn-ghost btn-sm"><Icon name="inbox" size={16} /> Download Excel (CSV)</a>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {RANGES.map((r) => (
          <Link key={r} href={`/admin/finance?range=${r}`} className={`pill py-1.5 px-3 text-sm ${range === r ? 'bg-accent text-white' : 'bg-surface border border-line text-muted hover:text-ink'}`}>
            {RANGE_LABEL[r]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`grad ${t.color} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 text-white/85 text-xs font-semibold"><Icon name={t.icon} size={16} /> {t.label}</div>
            <p className="font-display font-extrabold text-2xl tabular mt-2 break-words">{t.value}</p>
            <p className="text-xs text-white/80 mt-1">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* Day by day */}
        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 border-b border-line font-display font-bold">Day by day</h2>
          <div className="overflow-x-auto">
            <table className="table min-w-[560px]">
              <thead>
                <tr><th>Date</th><th className="text-right!">Deals</th><th className="text-right!">Weight</th><th className="text-right!">Value</th><th className="text-right!">GST</th><th className="text-right!">Your fee</th></tr>
              </thead>
              <tbody>
                {s.days.map((d) => (
                  <tr key={d.date}>
                    <td className="font-medium">{shortDate(d.date)} {d.date.slice(0, 4)}</td>
                    <td className="text-right tabular">{d.deals}</td>
                    <td className="text-right tabular">{d.weightKg ? `${num(d.weightKg)} kg` : '—'}</td>
                    <td className="text-right tabular">{rupees(d.amount)}</td>
                    <td className="text-right tabular">{rupees(d.gst)}</td>
                    <td className="text-right tabular font-semibold text-up">{rupees(d.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.days.length === 0 && <p className="p-6 text-center text-muted">No transactions in this period.</p>}
        </section>

        <div className="space-y-4">
          {/* Fee rate */}
          <section className="tone-purple card p-4">
            <h2 className="font-display font-bold flex items-center gap-2.5 mb-1">
              <span className="icon-tile size-8"><Icon name="shield" size={17} /></span>
              Platform fee rate
            </h2>
            <p className="text-xs text-muted mb-3">Charged on every new deal&apos;s amount before tax. Deals already made keep their rate.</p>
            <ActionForm action={setFeeRate} submitLabel="Save rate" submitClass="btn btn-primary btn-sm" className="space-y-2">
              <div className="flex items-center gap-2">
                <input name="commission_percent" type="number" step="0.01" min="0" max="10" defaultValue={feeRate} className="input tabular w-28 text-lg! font-bold" aria-label="Platform fee percent" required />
                <span className="font-bold text-lg">%</span>
              </div>
            </ActionForm>
          </section>

          {/* Payments in transit */}
          <section className="tone-amber card p-4">
            <h2 className="font-display font-bold flex items-center gap-2.5 mb-1">
              <span className="icon-tile size-8"><Icon name="coins" size={17} /></span>
              Payments awaiting seller
            </h2>
            <p className="font-display font-extrabold text-2xl tabular">{rupees(s.awaitingTotal)}</p>
            <p className="text-xs text-muted">{s.awaitingCount} deal(s) where the buyer says paid and the seller has not confirmed yet.</p>
          </section>
        </div>
      </div>

      {/* Every transaction */}
      <section className="card overflow-hidden">
        <h2 className="px-4 py-3 border-b border-line font-display font-bold">Every transaction</h2>
        <div className="overflow-x-auto">
          <table className="table min-w-[1080px]">
            <thead>
              <tr>
                <th>Date / bill</th><th>Seller → Buyer</th><th className="text-right!">Value</th><th className="text-right!">GST</th>
                <th className="text-right!">Buyer pays</th><th>Buyer → seller payment</th><th className="text-right!">Your fee</th><th>Fee collected?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/deals/${r.id}`} className="font-semibold text-accent underline">{r.grade}</Link>
                    <span className="block text-xs text-muted tabular">{shortDate(r.date)} · {r.origin === 'auction' ? 'Auction' : 'Daily rate'}</span>
                    {r.invoiceNo ? (
                      <Link href={`/deals/${r.id}/invoice`} className="block text-xs text-accent underline tabular">{r.invoiceNo}</Link>
                    ) : (
                      <span className="block text-xs text-muted">Not weighed yet</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {r.seller}
                    <span className="block text-muted">→ {r.buyer}</span>
                    <StatusPill status={r.status} />
                  </td>
                  <td className="text-right tabular">{r.invoiceNo ? rupees(r.amount) : '—'}</td>
                  <td className="text-right tabular">{r.invoiceNo ? rupees(r.gst) : '—'}</td>
                  <td className="text-right tabular font-semibold">{r.invoiceNo ? rupees(r.total) : '—'}</td>
                  <td className="text-sm">
                    {r.paymentConfirmedAt ? (
                      <span className="text-up font-semibold">✓ Received {shortDate(r.paymentConfirmedAt)}</span>
                    ) : r.paidAt ? (
                      <span className="text-[#8a6100] font-semibold">Buyer paid {shortDate(r.paidAt)}</span>
                    ) : (
                      <span className="text-muted">Not paid</span>
                    )}
                    {r.paymentRef && <span className="block text-xs text-muted tabular">{r.paymentRef}</span>}
                  </td>
                  <td className="text-right tabular">
                    <b className="text-[#5b21b6]">{r.invoiceNo ? rupees(r.fee) : '—'}</b>
                    <span className="block text-xs text-muted">{r.feePercent}%</span>
                  </td>
                  <td className="text-sm">
                    {r.feeReceivedAt ? (
                      <>
                        <span className="text-up font-semibold">✓ {dateTime(r.feeReceivedAt)}</span>
                        {r.feeRef && <span className="block text-xs text-muted tabular">{r.feeRef}</span>}
                        <form action={unmarkFeeReceived.bind(null, r.id)}><button className="text-xs text-muted underline">Undo</button></form>
                      </>
                    ) : r.invoiceNo ? (
                      <form action={markFeeReceived.bind(null, r.id)} className="flex gap-1">
                        <input name="fee_ref" placeholder="Ref (optional)" className="input min-h-8! py-1! w-28 text-xs!" aria-label="Fee payment reference" />
                        <button className="btn btn-success btn-sm">Received</button>
                      </form>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-6 text-center text-muted">No transactions in this period.</p>}
      </section>
    </div>
  )
}
