import type { Metadata } from 'next'
import { LotForm } from '@/components/TradeForms'
import { requireMember, canSell } from '@/lib/auth'
import { getBoard } from '@/lib/data'
import { bestRateLabels, gradeGroups } from '@/lib/catalog-ui'
import { getDict } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Auction a lot' }

export default async function NewLotPage() {
  const { profile } = await requireMember()
  const [{ t, locale }, { categories, entries }] = await Promise.all([getDict(), getBoard()])

  if (!canSell(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="card bg-warn-soft border-transparent p-5">⏳ {t.lots.needApprovalSell}</div>
      </div>
    )
  }

  return (
    <LotForm
      t={t}
      groups={gradeGroups(categories, entries.map((e) => e.grade), locale)}
      rates={bestRateLabels(entries, t)}
      area={profile.area ?? ''}
      address={profile.address ?? ''}
    />
  )
}
