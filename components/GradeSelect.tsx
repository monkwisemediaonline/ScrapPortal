'use client'

import { useState } from 'react'

export type GradeOption = { id: string; label: string; unit: string }
export type GradeGroup = { label: string; grades: GradeOption[] }

/** Grade picker grouped by category; shows today's best rate for the picked grade in large type. */
export default function GradeSelect({
  groups,
  defaultValue,
  label,
  rates,
  rateLabel,
  noRateLabel,
}: {
  groups: GradeGroup[]
  defaultValue?: string
  label: string
  rates?: Record<string, string>
  rateLabel?: string
  noRateLabel?: string
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const rate = rates?.[value]
  return (
    <div>
      <label className="label" htmlFor="grade_id">{label}</label>
      <select id="grade_id" name="grade_id" className="input min-h-12! font-medium" required value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="" disabled>—</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.grades.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {rate && (
        <div className="mt-3 rounded-xl bg-ok-soft px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{rateLabel}</span>
          <b className="font-display font-extrabold text-2xl text-up tabular">{rate}</b>
        </div>
      )}
      {value && !rate && noRateLabel && <p className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm">{noRateLabel}</p>}
    </div>
  )
}
