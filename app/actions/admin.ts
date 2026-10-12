'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { ActionState, SellRequest } from '@/lib/types'

const UNITS = ['kg', 'tonne', 'piece'] as const
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── Daily rates ──────────────────────────────────────────────

/** Form fields are named `r:<gradeId>:<sourceId>`; blank clears that day's rate. */
export async function saveRates(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireAdmin()
  const date = String(fd.get('rate_date') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Pick a date' }

  const upserts: Record<string, unknown>[] = []
  const clears: { grade_id: string; source_id: string }[] = []
  const units = new Map<string, string>()
  for (const [k, v] of fd.entries()) if (k.startsWith('u:')) units.set(k.slice(2), String(v))

  for (const [key, raw] of fd.entries()) {
    if (!key.startsWith('r:')) continue
    const [, grade_id, source_id] = key.split(':')
    const value = String(raw).trim()
    if (value === '') {
      clears.push({ grade_id, source_id })
      continue
    }
    const price = Number(value)
    if (!(price > 0)) return { error: `Invalid rate "${value}"` }
    upserts.push({ grade_id, source_id, price, rate_date: date, unit: units.get(grade_id) ?? 'kg', created_by: profile.id })
  }

  if (upserts.length) {
    const { error } = await supabase.from('rates').upsert(upserts, { onConflict: 'grade_id,source_id,rate_date' })
    if (error) return { error: error.message }
  }
  for (const c of clears) {
    await supabase.from('rates').delete().match({ ...c, rate_date: date })
  }
  revalidatePath('/', 'layout')
  return { ok: `Saved ${upserts.length} rates for ${date}` }
}

// ── Rate sources ─────────────────────────────────────────────

const sourceSchema = z.object({
  public_label: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).optional(),
  contact_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
})

export async function createSource(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = sourceSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: 'Public label is required' }
  const { contact_name, phone, notes, ...pub } = parsed.data
  const { data, error } = await supabase.from('rate_sources').insert({ ...pub, location: pub.location || null }).select('id').single()
  if (error || !data) return { error: error?.message }
  await supabase.from('rate_source_private').insert({ source_id: data.id, contact_name: contact_name || null, phone: phone || null, notes: notes || null })
  revalidatePath('/admin/sources')
  return { ok: 'Source added' }
}

export async function toggleSource(id: string, active: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from('rate_sources').update({ active }).eq('id', id)
  revalidatePath('/admin/sources')
  revalidatePath('/', 'layout')
}

export async function linkSourceBuyer(id: string, fd: FormData) {
  const { supabase } = await requireAdmin()
  const code = String(fd.get('public_code') ?? '').trim().toUpperCase()
  let buyer_id: string | null = null
  if (code) {
    const { data } = await supabase.from('profiles').select('id').eq('public_code', code).maybeSingle()
    buyer_id = data?.id ?? null
  }
  await supabase.from('rate_sources').update({ buyer_id }).eq('id', id)
  revalidatePath('/admin/sources')
}

// ── Catalog ──────────────────────────────────────────────────

export async function createCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const name_en = String(fd.get('name_en') ?? '').trim()
  if (!name_en) return { error: 'English name required' }
  const { error } = await supabase.from('categories').insert({
    name_en,
    name_hi: String(fd.get('name_hi') ?? '').trim() || null,
    name_pa: String(fd.get('name_pa') ?? '').trim() || null,
    slug: slugify(name_en),
    sort: Number(fd.get('sort') || 100),
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/catalog')
  return { ok: 'Category added' }
}

export async function createGrade(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const name_en = String(fd.get('name_en') ?? '').trim()
  const category_id = String(fd.get('category_id') ?? '')
  const unit = String(fd.get('unit') ?? 'kg')
  if (!name_en || !category_id || !UNITS.includes(unit as (typeof UNITS)[number])) return { error: 'Name, category and unit required' }
  const { error } = await supabase.from('grades').insert({
    category_id,
    name_en,
    name_hi: String(fd.get('name_hi') ?? '').trim() || null,
    name_pa: String(fd.get('name_pa') ?? '').trim() || null,
    description: String(fd.get('description') ?? '').trim() || null,
    slug: slugify(String(fd.get('slug') || name_en)),
    unit,
    sort: Number(fd.get('sort') || 100),
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/catalog')
  revalidatePath('/', 'layout')
  return { ok: 'Grade added' }
}

export async function toggleCatalog(table: 'categories' | 'grades', id: string, active: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from(table).update({ active }).eq('id', id)
  revalidatePath('/admin/catalog')
  revalidatePath('/', 'layout')
}

// ── Members ──────────────────────────────────────────────────

export async function setMemberStatus(id: string, status: 'approved' | 'rejected' | 'suspended' | 'pending') {
  const { supabase } = await requireAdmin()
  await supabase.from('profiles').update({ status }).eq('id', id)
  revalidatePath('/admin/members')
  revalidatePath('/admin')
}

export async function updateMember(id: string, fd: FormData) {
  const { supabase } = await requireAdmin()
  const role = String(fd.get('role'))
  await supabase
    .from('profiles')
    .update({
      role: ['seller', 'buyer', 'both', 'admin'].includes(role) ? role : undefined,
      admin_note: String(fd.get('admin_note') ?? '').trim() || null,
    })
    .eq('id', id)
  revalidatePath('/admin/members')
}

// ── Sell requests → deals ────────────────────────────────────

export async function setRequestStatus(id: string, status: 'contacted' | 'rejected' | 'new') {
  const { supabase } = await requireAdmin()
  await supabase.from('sell_requests').update({ status }).eq('id', id)
  revalidatePath('/admin/requests')
}

const convertSchema = z.object({
  agreed_rate: z.coerce.number().positive(),
  unit: z.enum(UNITS),
  source_id: z.string().optional(),
  buyer_code: z.string().trim().toUpperCase().optional(),
  admin_note: z.string().trim().max(1000).optional(),
})

export async function convertRequest(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const parsed = convertSchema.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: 'Agreed rate is required' }
  const { data: req } = await supabase.from('sell_requests').select('*').eq('id', id).single<SellRequest>()
  if (!req || req.deal_id) return { error: 'Request not found or already converted' }

  let buyer_id: string | null = null
  if (parsed.data.buyer_code) {
    const { data } = await supabase.from('profiles').select('id').eq('public_code', parsed.data.buyer_code).maybeSingle()
    if (!data) return { error: `No member with ID ${parsed.data.buyer_code}` }
    buyer_id = data.id
  }

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      origin: 'rate_card',
      sell_request_id: req.id,
      seller_id: req.seller_id,
      buyer_id,
      source_id: parsed.data.source_id || req.source_id,
      grade_id: req.grade_id,
      agreed_rate: parsed.data.agreed_rate,
      unit: parsed.data.unit,
      est_quantity: req.quantity,
      quantity_unit: req.quantity_unit,
      pickup_address: req.pickup_address,
    })
    .select('id')
    .single()
  if (error || !deal) return { error: error?.message }
  await supabase.from('sell_requests').update({ status: 'converted', deal_id: deal.id, admin_note: parsed.data.admin_note || null }).eq('id', id)
  revalidatePath('/admin/requests')
  redirect(`/deals/${deal.id}`)
}
