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

  // One round trip: the database checks the session token itself and returns the caller's
  // own row (nothing when signed out). proxy.ts has already refreshed the session.
  const fast = await supabase.rpc('my_profile').maybeSingle<Profile>()
  if (!fast.error) return { supabase, profile: fast.data }

  // my_profile() not installed yet (migration 20261016): the original two-step lookup
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, profile: null as Profile | null }
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>()
  return { supabase, profile: data }
})

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
