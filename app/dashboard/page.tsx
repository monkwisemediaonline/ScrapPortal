import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import MemberHome, { type BidWithLot } from '@/components/MemberHome'
import { requireMember } from '@/lib/auth'
import { getBoard, gradeMap } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import type { Deal, Lot, SellRequest } from '@/lib/types'

export const metadata: Metadata = { title: 'My account' }

export default async function Dashboard({ searchParams }: PageProps<'/dashboard'>) {
  const { sent, view } = await searchParams
  const { supabase, profile } = await requireMember()
  // Admins start on the admin dashboard; "My Account" in their menu passes ?view=me
  if (profile.role === 'admin' && view !== 'me' && !sent) redirect('/admin')

  const [{ t, locale }, { entries }] = await Promise.all([getDict(), getBoard()])

  const [{ data: requests }, { data: lots }, { data: bids }, { data: deals }] = await Promise.all([
    supabase.from('sell_requests').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('lots').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('bids').select('*, lots!bids_lot_id_fkey(title, status, closes_at)').eq('buyer_id', profile.id).order('updated_at', { ascending: false }).limit(20),
    supabase.from('deals').select('*').or(`seller_id.eq.${profile.id},buyer_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(20),
  ])

  const topRates = entries
    .filter((e) => e.row)
    .slice(0, 4)
    .map((e) => ({ slug: e.grade.slug, name: localName(e.grade, locale), price: Number(e.row!.best_price), unit: t.units[e.grade.unit] }))

  return (
    <MemberHome
      profile={profile}
      t={t}
      locale={locale}
      grades={gradeMap(entries.map((e) => e.grade))}
      topRates={topRates}
      deals={(deals ?? []) as Deal[]}
      requests={(requests ?? []) as SellRequest[]}
      lots={(lots ?? []) as Lot[]}
      bids={(bids ?? []) as BidWithLot[]}
      sent={!!sent}
    />
  )
}
