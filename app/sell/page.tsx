import type { Metadata } from 'next'
import { SellForm } from '@/components/TradeForms'
import { requireMember } from '@/lib/auth'
import { getBoard } from '@/lib/data'
import { bestRateLabels, gradeGroups } from '@/lib/catalog-ui'
import { getDict } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Sell at daily rate' }

export default async function SellPage({ searchParams }: PageProps<'/sell'>) {
  const { grade } = await searchParams
  const { profile } = await requireMember()
  const [{ t, locale }, { categories, entries }] = await Promise.all([getDict(), getBoard()])
  const grades = entries.map((e) => e.grade)

  return (
    <SellForm
      t={t}
      groups={gradeGroups(categories, grades, locale)}
      rates={bestRateLabels(entries, t)}
      preselected={grades.find((g) => g.slug === grade)?.id}
      area={profile.area ?? ''}
      address={profile.address ?? ''}
    />
  )
}
