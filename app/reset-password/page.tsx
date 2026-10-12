import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ResetForm from './ResetForm'
import { getDict } from '@/lib/i18n'
import { getProfile } from '@/lib/auth'

export const metadata: Metadata = { title: 'Set a new password' }

// Reached from the emailed reset link (via /auth/confirm), or by any signed-in member.
export default async function ResetPasswordPage() {
  const [{ t }, { profile }] = await Promise.all([getDict(), getProfile()])
  if (!profile) redirect('/login?error=link')

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6 md:p-8">
        <h1 className="font-display font-extrabold text-2xl mb-6">{t.login.newPasswordTitle}</h1>
        <ResetForm t={t.login} />
      </div>
    </div>
  )
}
