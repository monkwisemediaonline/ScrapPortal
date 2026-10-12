'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Landing page for the emailed sign-in link. The tokens arrive after the # in the URL,
// which only the browser can read, so this has to run on the client.
export default function ConfirmPage() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const nextParam = query.get('next') ?? '/dashboard'
    const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
    const fail = () => window.location.replace('/login?error=link')

    // Older links carry ?code= and are handled on the server
    if (query.get('code')) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(query.get('code')!)}&next=${encodeURIComponent(next)}`)
      return
    }

    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    if (!access_token || !refresh_token) return fail()

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => (error ? fail() : window.location.replace(next)))
      .catch(fail)
  }, [])

  return <p className="text-center text-muted py-24">Signing you in…</p>
}
