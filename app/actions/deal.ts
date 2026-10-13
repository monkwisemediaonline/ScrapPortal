'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import type { ActionState } from '@/lib/types'

/** Either side of a deal (or admin) posts a message. RLS decides who is allowed. */
export async function sendDealMessage(dealId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  const body = String(fd.get('body') ?? '').trim().slice(0, 2000)
  if (!body) return undefined
  const { error } = await supabase.from('deal_messages').insert({ deal_id: dealId, sender_id: profile.id, body })
  if (error) return { error: t.common.error }
  revalidatePath(`/deals/${dealId}`)
  return undefined
}

/** Buyer (or admin for an off-portal buyer) records that the money was sent. */
export async function recordPayment(dealId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  const payment_ref = String(fd.get('payment_ref') ?? '').trim().slice(0, 80)
  if (!payment_ref) return { error: t.common.required }
  const proof = fd.getAll('photos').map(String).find((u) => u.startsWith('https://'))
  const { error } = await supabase
    .from('deals')
    .update({ payment_ref, payment_proof: proof ?? null, paid_at: new Date().toISOString(), status: 'payment_pending' })
    .eq('id', dealId)
  if (error) return { error: error.message }
  revalidatePath(`/deals/${dealId}`)
  return { ok: `✓ ${t.common.saved}` }
}

/** Seller (or admin) confirms the money arrived; the deal becomes completed. */
export async function confirmPayment(dealId: string) {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  const { error } = await supabase.rpc('confirm_payment', { p_deal_id: dealId })
  if (error) throw new Error(error.message)
  revalidatePath(`/deals/${dealId}`)
}
