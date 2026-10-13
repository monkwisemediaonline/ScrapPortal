import type { createClient } from './supabase/server'
import { istDaysAgo, istToday } from './format'
import { invoiceTotals } from './invoice'
import type { Deal, DealStatus, Grade, Profile } from './types'

export const RANGES = ['today', '7d', 'month', 'all'] as const
export type Range = (typeof RANGES)[number]

export type FinanceRow = {
  id: string
  date: string // invoice date, or the day the deal was made if not weighed yet
  invoiceNo: string | null
  origin: Deal['origin']
  grade: string
  seller: string
  buyer: string
  weightKg: number | null
  amount: number // before tax
  gst: number
  total: number // what the buyer pays the seller
  feePercent: number
  fee: number
  status: DealStatus
  paymentRef: string | null
  paidAt: string | null
  paymentConfirmedAt: string | null
  feeReceivedAt: string | null
  feeRef: string | null
}

export function rangeStart(range: Range) {
  if (range === 'today') return istToday()
  if (range === '7d') return istDaysAgo(6)
  if (range === 'month') return istToday().slice(0, 8) + '01'
  return null
}

const istDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso))

/** Every non-cancelled deal in the period, with its money worked out. Admin only (RLS). */
export async function loadFinance(supabase: Awaited<ReturnType<typeof createClient>>, range: Range) {
  const { data } = await supabase.from('deals').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1000)
  const from = rangeStart(range)
  const deals = ((data ?? []) as Deal[])
    .map((d) => ({ d, date: d.invoice_date ?? istDate(d.created_at) }))
    .filter(({ date }) => !from || date >= from)

  const none = '00000000-0000-0000-0000-000000000000'
  const ids = [...new Set(deals.flatMap(({ d }) => [d.seller_id, d.buyer_id].filter(Boolean) as string[]))].concat(none)
  const [{ data: grades }, { data: people }, { data: sources }, { data: setting }] = await Promise.all([
    supabase.from('grades').select('id, name_en'),
    supabase.from('profiles').select('id, business_name, full_name, gstin').in('id', ids),
    supabase.from('rate_sources').select('id, public_label'),
    supabase.from('platform_settings').select('value').eq('key', 'commission_percent').maybeSingle(),
  ])
  const g = new Map(((grades ?? []) as Pick<Grade, 'id' | 'name_en'>[]).map((x) => [x.id, x.name_en]))
  const p = new Map(((people ?? []) as Pick<Profile, 'id' | 'business_name' | 'full_name' | 'gstin'>[]).map((x) => [x.id, x]))
  const src = new Map(((sources ?? []) as { id: string; public_label: string }[]).map((s) => [s.id, s.public_label]))

  const rows: FinanceRow[] = deals.map(({ d, date }) => {
    const seller = p.get(d.seller_id)
    const buyer = d.buyer_id ? p.get(d.buyer_id) : undefined
    const money = invoiceTotals(d, seller?.gstin ?? null, buyer?.gstin ?? null)
    return {
      id: d.id,
      date,
      invoiceNo: d.invoice_no,
      origin: d.origin,
      grade: g.get(d.grade_id) ?? 'Scrap',
      seller: seller?.business_name ?? seller?.full_name ?? '—',
      buyer: buyer ? buyer.business_name ?? buyer.full_name ?? '—' : `Off-portal${d.source_id && src.get(d.source_id) ? ` (${src.get(d.source_id)})` : ''}`,
      weightKg: d.final_weight_kg === null ? null : Number(d.final_weight_kg),
      amount: money.taxable,
      gst: money.gst,
      total: money.total,
      feePercent: Number(d.commission_percent),
      fee: Number(d.commission_amount ?? 0),
      status: d.status,
      paymentRef: d.payment_ref,
      paidAt: d.paid_at,
      paymentConfirmedAt: d.payment_confirmed_at,
      feeReceivedAt: d.fee_received_at,
      feeRef: d.fee_ref,
    }
  })

  return { rows, feeRate: setting ? Number(setting.value) : 0.25 }
}

export function financeSummary(rows: FinanceRow[]) {
  const sum = (list: FinanceRow[], key: 'amount' | 'gst' | 'total' | 'fee') => Math.round(list.reduce((a, r) => a + r[key], 0) * 100) / 100
  const completed = rows.filter((r) => r.status === 'completed')
  const open = rows.filter((r) => r.status !== 'completed')
  const collected = completed.filter((r) => r.feeReceivedAt)
  const awaiting = rows.filter((r) => r.paidAt && !r.paymentConfirmedAt)

  // One line per day, newest first
  const byDay = new Map<string, FinanceRow[]>()
  for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r])
  const days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      date,
      deals: list.length,
      weightKg: list.reduce((a, r) => a + (r.weightKg ?? 0), 0),
      amount: sum(list, 'amount'),
      gst: sum(list, 'gst'),
      total: sum(list, 'total'),
      fee: sum(list, 'fee'),
    }))

  return {
    deals: rows.length,
    traded: sum(rows, 'amount'),
    gst: sum(rows, 'gst'),
    total: sum(rows, 'total'),
    feeEarned: sum(completed, 'fee'),
    feeCollected: sum(collected, 'fee'),
    feeToCollect: Math.round((sum(completed, 'fee') - sum(collected, 'fee')) * 100) / 100,
    feeUpcoming: sum(open, 'fee'),
    awaitingCount: awaiting.length,
    awaitingTotal: sum(awaiting, 'total'),
    days,
  }
}
