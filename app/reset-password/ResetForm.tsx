'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dict } from '@/lib/i18n/en'

export default function ResetForm({ t }: { t: Dict['login'] }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setBusy(false)
      return setError(error.message)
    }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">{t.newPassword}</label>
        <input id="password" type="password" className="input" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="hint">{t.passwordHint}</p>
      </div>
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t.savePassword}</button>
    </form>
  )
}
