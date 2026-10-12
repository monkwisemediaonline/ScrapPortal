'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dict } from '@/lib/i18n/en'

type Mode = 'phone' | 'email'

export default function LoginForm({ t, next }: { t: Dict['login']; next: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('phone')
  const [value, setValue] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const target = mode === 'phone' ? '+91' + value.replace(/\D/g, '').slice(-10) : value.trim().toLowerCase()

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'phone' && target.length !== 13) return setError('Enter a 10-digit mobile number')
    setBusy(true)
    const supabase = createClient()
    const { error } = mode === 'phone'
      ? await supabase.auth.signInWithOtp({ phone: target })
      : await supabase.auth.signInWithOtp({ email: target })
    setBusy(false)
    if (error) return setError(error.message)
    setSentTo(target)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const supabase = createClient()
    const { error } = mode === 'phone'
      ? await supabase.auth.verifyOtp({ phone: sentTo!, token: code, type: 'sms' })
      : await supabase.auth.verifyOtp({ email: sentTo!, token: code, type: 'email' })
    if (error) {
      setBusy(false)
      return setError(error.message)
    }
    router.replace(next)
    router.refresh()
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-sm text-muted">
          {t.sentTo} <b className="text-ink">{sentTo}</b>{' '}
          <button type="button" className="text-accent font-semibold" onClick={() => { setSentTo(null); setCode('') }}>
            {t.change}
          </button>
        </p>
        <div>
          <label className="label" htmlFor="code">{t.code}</label>
          <input
            id="code"
            className="input tabular tracking-[.4em] text-center text-xl"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            required
          />
        </div>
        {error && <p role="alert" className="text-sm text-down">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || code.length < 6}>{busy ? '…' : t.verify}</button>
      </form>
    )
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg bg-bg p-1 text-sm font-semibold" role="tablist">
        {(['phone', 'email'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setValue(''); setError('') }}
            className={`py-2 rounded-md ${mode === m ? 'bg-surface shadow-sm' : 'text-muted'}`}
          >
            {m === 'phone' ? t.phone : t.email}
          </button>
        ))}
      </div>
      {mode === 'phone' ? (
        <div>
          <label className="label" htmlFor="phone">{t.phoneLabel}</label>
          <div className="flex">
            <span className="input w-auto! rounded-r-none border-r-0 bg-bg text-muted grid place-items-center">+91</span>
            <input
              id="phone"
              className="input rounded-l-none tabular"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="email">{t.emailLabel}</label>
          <input id="email" type="email" className="input" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t.send}</button>
    </form>
  )
}
