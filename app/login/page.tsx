import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { getDict } from '@/lib/i18n'
import { getProfile } from '@/lib/auth'

export const metadata: Metadata = { title: 'Login' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error, mode } = await searchParams
  const safeNext = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  const [{ t }, { profile }] = await Promise.all([getDict(), getProfile()])
  if (profile) redirect(safeNext)

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6 md:p-8">
        {error === 'link' && <p role="alert" className="rounded-lg bg-[#fdecea] text-down text-sm p-3 mb-4">{t.login.linkError}</p>}
        <LoginForm t={t.login} next={safeNext} initialMode={mode === 'signup' ? 'signup' : 'signin'} />
      </div>
    </div>
  )
}
