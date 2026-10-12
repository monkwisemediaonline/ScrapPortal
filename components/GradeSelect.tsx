'use client'

import { useState } from 'react'

export type GradeOption = { id: string; label: string; unit: string }
export type GradeGroup = { label: string; grades: GradeOption[] }

/** Grade picker grouped by category; optionally shows today's best rate for the picked grade. */
export default function GradeSelect({
  groups,
  defaultValue,
  label,
  rates,
  rateLabel,
}: {
  groups: GradeGroup[]
  defaultValue?: string
  label: string
  rates?: Record<string, string>
  rateLabel?: string
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const rate = rates?.[value]
  return (
    <div>
      <label className="label" htmlFor="grade_id">{label}</label>
      <select id="grade_id" name="grade_id" className="input" required value={value} onChange={(e) => setValue(e.target.value)}>
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
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
          {rateLabel}: <b className="tabular">{rate}</b>
        </p>
      )}
    </div>
  )
}
