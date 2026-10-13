import { notFound } from 'next/navigation'
import DealView, { type DealEvent, type DealMessage } from '@/components/DealView'
import { requireMember } from '@/lib/auth'
import { SUPPORT_PHONE } from '@/lib/config'
import { getDict, localName } from '@/lib/i18n'
import type { InvoiceParty } from '@/lib/invoice'
import type { Deal, Grade } from '@/lib/types'

export default async function DealPage({ params }: PageProps<'/deals/[id]'>) {
  const { id } = await params
  const { supabase, profile } = await requireMember()
  const { t, locale } = await getDict()

  const { data: deal } = await supabase.from('deals').select('*').eq('id', id).maybeSingle<Deal>()
  if (!deal) notFound()

  const [{ data: grade }, { data: parties }, { data: events }, { data: messages }] = await Promise.all([
    supabase.from('grades').select('*').eq('id', deal.grade_id).single<Grade>(),
    supabase.rpc('deal_invoice_parties', { p_deal_id: deal.id }),
    supabase.from('deal_events').select('*').eq('deal_id', deal.id).order('created_at'),
    supabase.from('deal_messages').select('*').eq('deal_id', deal.id).order('created_at').limit(200),
  ])

  return (
    <DealView
      deal={deal}
      gradeName={localName(grade, locale)}
      t={t}
      viewer={{ id: profile.id, isAdmin: profile.role === 'admin' }}
      parties={(parties ?? []) as InvoiceParty[]}
      messages={(messages ?? []) as DealMessage[]}
      events={(events ?? []) as DealEvent[]}
      supportPhone={SUPPORT_PHONE}
    />
  )
}
