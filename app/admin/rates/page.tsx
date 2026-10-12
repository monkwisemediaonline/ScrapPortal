import Link from 'next/link'
import RateGrid from './RateGrid'
import { requireAdmin } from '@/lib/auth'
import { istToday } from '@/lib/format'
import type { Category, Grade, Rate, RateSource } from '@/lib/types'

export default async function AdminRates({ searchParams }: PageProps<'/admin/rates'>) {
  const { date: qDate } = await searchParams
  const date = typeof qDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : istToday()
  const { supabase } = await requireAdmin()

  const lookback = new Date(new Date(date).getTime() - 10 * 864e5).toISOString().slice(0, 10)
  const [{ data: cats }, { data: grades }, { data: sources }, { data: current }, { data: previous }] = await Promise.all([
    supabase.from('categories').select('*').eq('active', true).order('sort'),
    supabase.from('grades').select('*').eq('active', true).order('sort'),
    supabase.from('rate_sources').select('*').eq('active', true).order('created_at'),
    supabase.from('rates').select('*').eq('rate_date', date),
    supabase.from('rates').select('*').lt('rate_date', date).gte('rate_date', lookback).order('rate_date', { ascending: false }).limit(1000),
  ])

  const catList = (cats ?? []) as Category[]
  const rows = catList.flatMap((c) =>
    ((grades ?? []) as Grade[]).filter((g) => g.category_id === c.id).map((g) => ({ id: g.id, name: g.name_en, category: c.name_en, unit: g.unit }))
  )
  const cur: Record<string, number> = {}
  for (const r of (current ?? []) as Rate[]) cur[`${r.grade_id}:${r.source_id}`] = Number(r.price)
  const last: Record<string, number> = {}
  for (const r of (previous ?? []) as Rate[]) {
    const k = `${r.grade_id}:${r.source_id}`
    if (!(k in last)) last[k] = Number(r.price)
  }
  const srcList = ((sources ?? []) as RateSource[]).map((s) => ({ id: s.id, label: s.public_label }))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl">Daily rates</h1>
          <p className="text-sm text-muted">Buying rate each source is paying today. The board shows the best rate per grade.</p>
        </div>
        <form className="flex gap-2">
          <input type="date" name="date" defaultValue={date} className="input min-h-9!" />
          <button className="btn btn-ghost btn-sm">Go</button>
        </form>
      </div>
      {srcList.length === 0 ? (
        <div className="card p-6">
          No rate sources yet. <Link href="/admin/sources" className="text-accent font-semibold underline">Add your first source</Link> (e.g. the furnace you get iron rates from).
        </div>
      ) : (
        <RateGrid key={date} date={date} grades={rows} sources={srcList} current={cur} last={last} />
      )}
    </div>
  )
}
