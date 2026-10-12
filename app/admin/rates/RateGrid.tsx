'use client'

import { useActionState, useRef } from 'react'
import { saveRates } from '@/app/actions/admin'

type Row = { id: string; name: string; category: string; unit: string }
type Source = { id: string; label: string }

/** Grades × sources input grid. Placeholders show the last known rate; one click copies them in. */
export default function RateGrid({
  date,
  grades,
  sources,
  current,
  last,
}: {
  date: string
  grades: Row[]
  sources: Source[]
  current: Record<string, number>
  last: Record<string, number>
}) {
  const [state, action, pending] = useActionState(saveRates, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  function copyLast() {
    formRef.current?.querySelectorAll<HTMLInputElement>('input[data-last]').forEach((el) => {
      if (!el.value && el.dataset.last) el.value = el.dataset.last
    })
  }

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="rate_date" value={date} />
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={copyLast} className="btn btn-ghost btn-sm">Fill blanks with last known rates</button>
        <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? 'Saving…' : `Save rates for ${date}`}</button>
        {state?.error && <span role="alert" className="text-sm text-down self-center">{state.error}</span>}
        {state?.ok && <span role="status" className="text-sm text-up self-center">{state.ok}</span>}
      </div>
      <div className="card overflow-x-auto">
        <table className="table min-w-[560px]">
          <thead>
            <tr>
              <th>Grade</th>
              {sources.map((s) => <th key={s.id} className="min-w-[120px]">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => {
              const header = i === 0 || grades[i - 1].category !== g.category
              return [
                header && (
                  <tr key={`h-${g.category}`}>
                    <td colSpan={sources.length + 1} className="bg-bg font-semibold text-xs uppercase tracking-wide text-muted py-2!">{g.category}</td>
                  </tr>
                ),
                <tr key={g.id}>
                  <td className="font-medium">
                    {g.name} <span className="text-xs text-muted">₹/{g.unit}</span>
                    <input type="hidden" name={`u:${g.id}`} value={g.unit} />
                  </td>
                  {sources.map((s) => {
                    const k = `${g.id}:${s.id}`
                    return (
                      <td key={s.id}>
                        <input
                          name={`r:${k}`}
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          defaultValue={current[k] ?? ''}
                          placeholder={last[k] !== undefined ? String(last[k]) : ''}
                          data-last={last[k] ?? ''}
                          className="input min-h-9! py-1! tabular"
                          aria-label={`${g.name} — ${s.label}`}
                        />
                      </td>
                    )
                  })}
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>
      <p className="hint mt-2">Leave a cell blank to remove that buyer&apos;s rate for this date. Placeholder = that buyer&apos;s last rate.</p>
    </form>
  )
}
