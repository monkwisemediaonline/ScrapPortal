'use client'

import { useState } from 'react'
import { createClient, createEmailLinkClient } from '@/lib/supabase/client'
import type { Dict } from '@/lib/i18n/en'

type Mode = 'signin' | 'signup'

/** Fails instead of spinning forever if the auth request never comes back. */
function withTimeout<T>(promise: PromiseLike<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('No response from the login service. Reload the page and try again.')), ms)
    ),
  ])
}

export default function LoginForm({ t, next, initialMode }: { t: Dict['login']; next: string; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const cleanEmail = email.trim().toLowerCase()
  const confirmUrl = (to: string) => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(to)}`

  async function run(fn: () => Promise<void>) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(async () => {
      if (mode === 'signin') {
        const { error } = await withTimeout(createClient().auth.signInWithPassword({ email: cleanEmail, password }))
        if (error) return setError(error.code === 'invalid_credentials' ? t.invalid : error.message)
        window.location.assign(next)
        return
      }

      // Sign up through the link-anywhere client so a confirmation email (if Supabase
      // requires one) can be opened on any device; see lib/supabase/client.ts.
      const { data, error } = await withTimeout(
        createEmailLinkClient().auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo: confirmUrl(next) } })
      )
      if (error) return setError(error.code === 'user_already_exists' ? t.exists : error.message)
      if (data.session) {
        const { access_token, refresh_token } = data.session
        await createClient().auth.setSession({ access_token, refresh_token })
        window.location.assign(next)
      } else if (data.user && data.user.identities?.length === 0) {
        // Supabase hides "already registered" behind a fake success when confirmation is on
        setError(t.exists)
      } else {
        setNotice(`${t.confirmSent} ${cleanEmail}`)
      }
    })
  }

  function forgot() {
    if (!cleanEmail) return setError(t.resetNeedEmail)
    run(async () => {
      const { error } = await withTimeout(
        createEmailLinkClient().auth.resetPasswordForEmail(cleanEmail, { redirectTo: confirmUrl('/reset-password') })
      )
      if (error) return setError(error.message)
      setNotice(`${t.resetSent} ${cleanEmail}`)
    })
  }

  const signup = mode === 'signup'
  return (
    <>
      <h1 className="font-display font-extrabold text-2xl">{signup ? t.titleSignup : t.title}</h1>
      <p className="text-muted text-sm mt-1 mb-6">{signup ? t.subSignup : t.sub}</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{t.emailLabel}</label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="label" htmlFor="password">{t.password}</label>
            {!signup && (
              <button type="button" onClick={forgot} className="text-xs text-accent font-semibold" disabled={busy}>
                {t.forgot}
              </button>
            )}
          </div>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={signup ? 'new-password' : 'current-password'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {signup && <p className="hint">{t.passwordHint}</p>}
        </div>
        {error && <p role="alert" className="text-sm text-down">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-ok-soft text-up text-sm p-3">{notice}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : signup ? t.signUp : t.signIn}</button>
      </form>
      <p className="text-sm text-center mt-5">
        <span className="text-muted">{signup ? t.haveAccount : t.noAccount} </span>
        <button
          type="button"
          className="text-accent font-semibold"
          onClick={() => {
            setMode(signup ? 'signin' : 'signup')
            setError('')
            setNotice('')
          }}
        >
          {signup ? t.signIn : t.signUp}
        </button>
      </p>
    </>
  )
}
