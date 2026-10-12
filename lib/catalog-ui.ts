import { localName, type Dict, type Locale } from './i18n'
import type { BoardEntry } from './data'
import type { Category, Grade } from './types'
import { rupees } from './format'
import type { GradeGroup } from '@/components/GradeSelect'

export function gradeGroups(categories: Category[], grades: Grade[], locale: Locale): GradeGroup[] {
  return categories
    .map((c) => ({
      label: localName(c, locale),
      grades: grades.filter((g) => g.category_id === c.id).map((g) => ({ id: g.id, label: localName(g, locale), unit: g.unit })),
    }))
    .filter((g) => g.grades.length)
}

export function bestRateLabels(entries: BoardEntry[], t: Dict) {
  return Object.fromEntries(
    entries.filter((e) => e.row).map((e) => [e.grade.id, `${rupees(e.row!.best_price)}/${t.units[e.grade.unit]}`])
  )
}
