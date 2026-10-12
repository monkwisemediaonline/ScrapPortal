'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getProfile, canSell } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import { amountFor } from '@/lib/format'
import type { ActionState, Grade, Rate } from '@/lib/types'

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const UNITS = ['kg', 'tonne', 'piece'] as const

const str = (max = 200) => z.string().trim().max(max)
const photos = (fd: FormData) => fd.getAll('photos').map(String).filter((u) => u.startsWith('https://')).slice(0, 8)

// ── Onboarding ───────────────────────────────────────────────

const onboardingSchema = z.object({
  full_name: str(80).min(2),
  business_name: str(120).min(2),
  gstin: z.string().trim().toUpperCase().refine((v) => v === '' || GSTIN.test(v), 'Invalid GSTIN'),
  role: z.enum(['seller', 'buyer', 'both']),
  area: str(120).min(2),
  address: str(400).min(5),
})

export async function completeOnboarding(_: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')

  const parsed = onboardingSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) {
    const gstinIssue = parsed.error.issues.find((i) => i.path[0] === 'gstin')
    return { error: gstinIssue ? `${t.onboarding.gstin}: ${t.onboarding.gstinHint}` : t.common.required }
  }
  const { error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, gstin: parsed.data.gstin || null, status: profile.status === 'incomplete' ? 'pending' : profile.status })
    .eq('id', profile.id)
  if (error) return { error: t.common.error }
  redirect('/dashboard')
}

// ── Sell request (rate card) ─────────────────────────────────

const sellSchema = z.object({
  grade_id: z.uuid(),
  quantity: z.coerce.number().positive().max(10_000_000),
  quantity_unit: z.enum(UNITS),
  area: str(120).min(2),
  pickup_address: str(400).optional(),
  notes: str(1000).optional(),
})

export async function createSellRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  if (!['pending', 'approved'].includes(profile.status)) return { error: t.account.rejectedBody }

  const parsed = sellSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: t.common.required }

  // Snapshot the best rate on the latest date at the moment the seller asked
  const { data: grade } = await supabase.from('grades').select('*').eq('id', parsed.data.grade_id).single<Grade>()
  if (!grade) return { error: t.common.error }
  const { data: best } = await supabase
    .from('rates')
    .select('*, rate_sources!inner(active)')
    .eq('grade_id', grade.id)
    .eq('rate_sources.active', true)
    .order('rate_date', { ascending: false })
    .order('price', { ascending: false })
    .limit(1)
    .maybeSingle<Rate>()

  const { error } = await supabase.from('sell_requests').insert({
    seller_id: profile.id,
    grade_id: grade.id,
    source_id: best?.source_id ?? null,
    rate_id: best?.id ?? null,
    quoted_price: best?.price ?? null,
    unit: best?.unit ?? grade.unit,
    quantity: parsed.data.quantity,
    quantity_unit: parsed.data.quantity_unit,
    area: parsed.data.area,
    pickup_address: parsed.data.pickup_address || profile.address,
    notes: parsed.data.notes || null,
    photos: photos(fd),
  })
  if (error) return { error: t.common.error }
  revalidatePath('/dashboard')
  redirect('/dashboard?sent=1')
}

export async function cancelSellRequest(id: string) {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  await supabase.from('sell_requests').update({ status: 'cancelled' }).eq('id', id).eq('seller_id', profile.id).eq('status', 'new')
  revalidatePath('/dashboard')
}

// ── Lots & bids (auction) ────────────────────────────────────

const lotSchema = z.object({
  grade_id: z.uuid(),
  title: str(120).min(3),
  description: str(2000).optional(),
  quantity: z.coerce.number().positive().max(10_000_000),
  quantity_unit: z.enum(UNITS),
  price_unit: z.enum(UNITS),
  min_rate: z.union([z.literal(''), z.coerce.number().positive()]).optional(),
  area: str(120).min(2),
  inspection_note: str(300).optional(),
  duration_hours: z.coerce.number().int().min(1).max(24 * 14),
})

export async function createLot(_: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  if (!canSell(profile)) return { error: t.lots.needApprovalSell }

  const parsed = lotSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: t.common.required }
  const { duration_hours, min_rate, ...rest } = parsed.data

  const { data, error } = await supabase
    .from('lots')
    .insert({
      ...rest,
      description: rest.description || null,
      inspection_note: rest.inspection_note || null,
      min_rate: min_rate === '' || min_rate === undefined ? null : min_rate,
      seller_id: profile.id,
      photos: photos(fd),
      closes_at: new Date(Date.now() + duration_hours * 3600_000).toISOString(),
    })
    .select('id')
    .single()
  if (error || !data) return { error: t.common.error }
  revalidatePath('/lots')
  redirect(`/lots/${data.id}`)
}

export async function cancelLot(lotId: string) {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  await supabase.from('lots').update({ status: 'cancelled' }).eq('id', lotId).eq('seller_id', profile.id).eq('status', 'open')
  revalidatePath(`/lots/${lotId}`)
}

const bidSchema = z.object({ rate: z.coerce.number().positive().max(10_000_000), note: str(300).optional() })

export async function placeBid(lotId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')

  const parsed = bidSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: t.common.required }

  const { data: existing } = await supabase.from('bids').select('id').eq('lot_id', lotId).eq('buyer_id', profile.id).maybeSingle()
  const payload = { rate: parsed.data.rate, note: parsed.data.note || null, status: 'active' }
  const { error } = existing
    ? await supabase.from('bids').update(payload).eq('id', existing.id)
    : await supabase.from('bids').insert({ ...payload, lot_id: lotId, buyer_id: profile.id })
  // Trigger messages (closed lot, below starting rate, own lot) are written for people
  if (error) return { error: error.message.includes('row-level security') ? t.lots.needApprovalBuy : error.message }
  revalidatePath(`/lots/${lotId}`)
  return { ok: '✓' }
}

export async function withdrawBid(lotId: string) {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  await supabase.from('bids').update({ status: 'withdrawn' }).eq('lot_id', lotId).eq('buyer_id', profile.id)
  revalidatePath(`/lots/${lotId}`)
}

export async function acceptBid(lotId: string, bidId: string) {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  const { data: dealId, error } = await supabase.rpc('accept_bid', { p_bid_id: bidId })
  if (error) throw new Error(error.message)
  revalidatePath(`/lots/${lotId}`)
  redirect(`/deals/${dealId}`)
}

// ── Deals ────────────────────────────────────────────────────

const dealSchema = z.object({
  status: z.enum(['confirmed', 'pickup_scheduled', 'weighed', 'payment_pending', 'completed', 'cancelled']),
  pickup_date: z.union([z.literal(''), z.iso.date()]).optional(),
  final_weight_kg: z.union([z.literal(''), z.coerce.number().nonnegative()]).optional(),
  deduction_amount: z.union([z.literal(''), z.coerce.number().nonnegative()]).optional(),
  deduction_note: str(300).optional(),
  weighbridge_slip: z.string().optional(),
})

/** Used by the deal's buyer and by admin. RLS + deals_guard keep commercial terms fixed for buyers. */
export async function updateDeal(dealId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getDict()
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')

  const parsed = dealSchema.safeParse({ ...Object.fromEntries(fd), weighbridge_slip: photos(fd)[0] })
  if (!parsed.success) return { error: t.common.required }
  const d = parsed.data

  const { data: deal } = await supabase.from('deals').select('agreed_rate, unit').eq('id', dealId).single()
  if (!deal) return { error: t.common.error }

  const weight = d.final_weight_kg === '' || d.final_weight_kg === undefined ? null : d.final_weight_kg
  const deduction = d.deduction_amount === '' || d.deduction_amount === undefined ? 0 : d.deduction_amount
  const update: Record<string, unknown> = {
    status: d.status,
    pickup_date: d.pickup_date || null,
    final_weight_kg: weight,
    deduction_amount: deduction,
    deduction_note: d.deduction_note || null,
    final_amount: weight === null ? null : Math.round((amountFor(weight, Number(deal.agreed_rate), deal.unit) - deduction) * 100) / 100,
  }
  if (d.weighbridge_slip) update.weighbridge_slip = d.weighbridge_slip

  const { error } = await supabase.from('deals').update(update).eq('id', dealId)
  if (error) return { error: error.message }
  revalidatePath(`/deals/${dealId}`)
  return { ok: '✓' }
}
