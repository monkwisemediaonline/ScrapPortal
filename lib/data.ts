import { cache } from 'react'
import { createClient } from './supabase/server'
import type { BoardRow, Category, Grade } from './types'

export const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// cache(): several components on one page can ask for the catalog without asking the database twice.
export const getCatalog = cache(async () => {
  if (!supabaseConfigured) return { categories: [] as Category[], grades: [] as Grade[] }
  const supabase = await createClient()
  const [{ data: categories }, { data: grades }] = await Promise.all([
    supabase.from('categories').select('*').eq('active', true).order('sort'),
    supabase.from('grades').select('*').eq('active', true).order('sort'),
  ])
  return { categories: (categories ?? []) as Category[], grades: (grades ?? []) as Grade[] }
})

export type BoardEntry = { grade: Grade; category: Category; row: BoardRow | null }

const getBoardRows = cache(async () => {
  if (!supabaseConfigured) return [] as BoardRow[]
  const supabase = await createClient()
  const { data } = await supabase.rpc('rate_board')
  return (data ?? []) as BoardRow[]
})

/** Catalog joined with the latest best rate per grade, grouped in category order. */
export const getBoard = cache(async () => {
  // Catalog and rates are fetched side by side, not one after the other
  const [{ categories, grades }, rows] = await Promise.all([getCatalog(), getBoardRows()])
  const byGrade = new Map(rows.map((r) => [r.grade_id, r]))
  const catById = new Map(categories.map((c) => [c.id, c]))
  const entries: BoardEntry[] = grades
    .filter((g) => catById.has(g.category_id))
    .map((g) => ({ grade: g, category: catById.get(g.category_id)!, row: byGrade.get(g.id) ?? null }))
  return { categories, entries }
})

export function gradeMap(grades: Grade[]) {
  return new Map(grades.map((g) => [g.id, g]))
}
