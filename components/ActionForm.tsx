'use client'

import { useActionState, type ReactNode } from 'react'
import type { ActionState } from '@/lib/types'

/**
 * Wraps a server action of shape (prevState, formData) => ActionState,
 * showing its error / success message and disabling the submit button while pending.
 */
export default function ActionForm({
  action,
  children,
  submitLabel,
  submitClass = 'btn btn-primary',
  className = 'space-y-4',
  confirm,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children?: ReactNode
  submitLabel: string
  submitClass?: string
  className?: string
  confirm?: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {children}
      {/* col-span-full keeps the footer on its own row when the form is a grid */}
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <button className={submitClass} disabled={pending}>
          {pending ? '…' : submitLabel}
        </button>
        {state?.error && <p role="alert" className="text-sm text-down">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm font-medium text-up">{state.ok}</p>}
      </div>
    </form>
  )
}
