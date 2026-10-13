import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import { supabaseConfigured } from './data'
import type { Profile } from './types'

/**
 * Current user's profile, or null when signed out.
 * Wrapped in cache() so the layout, the page and its helpers share one lookup per request.
 */
export const getProfile = cache(async () => {
  // Lets public pages render before .env.local is set up; member pages redirect to /login.
  if (!supabaseConfigured) {
    return { supabase: null as unknown as Awaited<ReturnType<typeof createClient>>, profile: null as Profile | null }
  }
  const supabase = await createClient()

  // Signed out: no cookie, no database call at all.
  const { data: { session } } = await supabase.auth.getSession()
  const memberId = session ? tokenSubject(session.access_token) : null
  if (!memberId) return { supabase, profile: null as Profile | null }

  // One round trip. The id above is read from the cookie without checking it, so it is only
  // a hint for which row to ask for: the database verifies the token's signature on this very
  // request and row-level security returns the row only to its real owner. A forged or
  // expired token gets an error here, which we treat as signed out.
  const { data, error } = await supabase.from('profiles').select('*').eq('id', memberId).maybeSingle<Profile>()
  return { supabase, profile: error ? null : data }
})

/** The member id ("sub") inside a session token. Decoded only, not verified. */
function tokenSubject(jwt: string): string | null {
  try {
    const sub = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')).sub
    return typeof sub === 'string' && /^[0-9a-f-]{36}$/i.test(sub) ? sub : null
  } catch {
    return null
  }
}

/** For member pages: must be signed in and have finished onboarding. */
export async function requireMember() {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'incomplete') redirect('/onboarding')
  return { supabase, profile }
}

export async function requireAdmin() {
  const { supabase, profile } = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')
  return { supabase, profile }
}

export const canSell = (p: Profile) => p.status === 'approved' && ['seller', 'both', 'admin'].includes(p.role)
export const canBuy = (p: Profile) => p.status === 'approved' && ['buyer', 'both', 'admin'].includes(p.role)
