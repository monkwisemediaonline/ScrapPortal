'use client'

import { useFormStatus } from 'react-dom'

/** Submit button that asks for confirmation first. Use inside a <form action={serverAction}>. */
export default function ConfirmButton({ message, children, className = 'btn btn-primary btn-sm' }: { message: string; children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {pending ? '…' : children}
    </button>
  )
}
