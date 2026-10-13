import { NextResponse, type NextRequest } from 'next/server'
import { getProfile } from '@/lib/auth'
import { loadFinance, RANGES, type Range } from '@/lib/finance'

// CSV of every transaction in the period, for Excel / the accountant. Admin only.
export async function GET(request: NextRequest) {
  const { supabase, profile } = await getProfile()
  if (profile?.role !== 'admin') return new NextResponse('Not allowed', { status: 403 })

  const q = request.nextUrl.searchParams.get('range')
  const range: Range = RANGES.includes(q as Range) ? (q as Range) : 'month'
  const { rows } = await loadFinance(supabase, range)

  const header = [
    'Date', 'Invoice no', 'Type', 'Scrap', 'Seller', 'Buyer', 'Weight kg', 'Value before tax', 'GST', 'Buyer pays',
    'Deal status', 'Buyer paid on', 'Payment reference', 'Seller confirmed on', 'Fee %', 'Platform fee', 'Fee received on', 'Fee reference',
  ]
  // Quote everything; a leading ' stops Excel running a cell that starts with = + - @ as a formula
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v)
    return `"${(/^[=+\-@]/.test(s) && typeof v === 'string' ? "'" + s : s).replace(/"/g, '""')}"`
  }
  const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso)) : '')
  const lines = rows.map((r) =>
    [
      r.date, r.invoiceNo, r.origin === 'auction' ? 'Auction' : 'Daily rate', r.grade, r.seller, r.buyer, r.weightKg, r.amount, r.gst, r.total,
      r.status, day(r.paidAt), r.paymentRef, day(r.paymentConfirmedAt), r.feePercent, r.fee, day(r.feeReceivedAt), r.feeRef,
    ].map(cell).join(',')
  )
  // BOM so Excel reads ₹ and Indian names correctly
  const csv = '﻿' + [header.map(cell).join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lsx-transactions-${range}.csv"`,
    },
  })
}
