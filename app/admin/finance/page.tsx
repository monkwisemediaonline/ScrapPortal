import type { Metadata } from 'next'
import FinanceView from '@/components/FinanceView'
import { requireAdmin } from '@/lib/auth'
import { loadFinance, RANGES, type Range } from '@/lib/finance'

export const metadata: Metadata = { title: 'Finance' }

export default async function AdminFinance({ searchParams }: PageProps<'/admin/finance'>) {
  const { range: q } = await searchParams
  const range: Range = RANGES.includes(q as Range) ? (q as Range) : 'month'
  const { supabase } = await requireAdmin()
  const { rows, feeRate } = await loadFinance(supabase, range)
  return <FinanceView rows={rows} range={range} feeRate={feeRate} />
}
