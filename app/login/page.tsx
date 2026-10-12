import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { getDict } from '@/lib/i18n'
import { getProfile } from '@/lib/auth'

export const metadata: Metadata = { title: 'Login' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams
  const safeNext = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  const [{ t }, { profile }] = await Promise.all([getDict(), getProfile()])
  if (profile) redirect(safeNext)

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6 md:p-8">
        <h1 className="font-display font-extrabold text-2xl">{t.login.title}</h1>
        <p className="text-muted text-sm mt-1 mb-6">{t.login.sub}</p>
        <LoginForm t={t.login} next={safeNext} />
      </div>
    </div>
  )
}
