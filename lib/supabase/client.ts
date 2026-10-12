import { createBrowserClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Only for requesting an email sign-in link. The default client ties the link to the
 * browser that asked for it, so it breaks when the email is opened on another device
 * or in a mail app. This one asks for a link that works anywhere; /auth/confirm
 * turns it into a session.
 */
export function createEmailLinkClient() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
