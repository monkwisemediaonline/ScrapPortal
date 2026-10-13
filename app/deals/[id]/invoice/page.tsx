import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import InvoiceSheet from '@/components/InvoiceSheet'
import PrintButton from '@/components/PrintButton'
import { requireMember } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import type { InvoiceParty } from '@/lib/invoice'
import type { Deal, Grade } from '@/lib/types'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoicePage({ params }: PageProps<'/deals/[id]/invoice'>) {
  const { id } = await params
  const { supabase } = await requireMember()
  const { t } = await getDict()

  // RLS: only the two parties and admin can load the deal
  const { data: deal } = await supabase.from('deals').select('*').eq('id', id).maybeSingle<Deal>()
  if (!deal || !deal.invoice_no) notFound()

  const [{ data: grade }, { data: parties }] = await Promise.all([
    supabase.from('grades').select('*').eq('id', deal.grade_id).single<Grade>(),
    supabase.rpc('deal_invoice_parties', { p_deal_id: deal.id }),
  ])
  const list = (parties ?? []) as InvoiceParty[]

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-[800px] flex items-center justify-between mb-4 print:hidden">
        <Link href={`/deals/${deal.id}`} className="text-sm text-muted hover:text-ink">← {t.common.back}</Link>
        <PrintButton label={t.deals.viewInvoice} />
      </div>
      <InvoiceSheet
        deal={deal}
        gradeName={grade?.name_en ?? 'Scrap'}
        seller={list.find((p) => p.party === 'seller')}
        buyer={list.find((p) => p.party === 'buyer')}
      />
    </div>
  )
}
