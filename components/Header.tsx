import Link from 'next/link'
import { APP_NAME, APP_SHORT } from '@/lib/config'
import { getProfile } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import { signOut } from '@/app/actions/auth'
import LangSwitcher from './LangSwitcher'

export default async function Header() {
  const [{ t, locale }, { profile }] = await Promise.all([getDict(), getProfile()])
  const links = [
    { href: '/rates', label: t.nav.rates },
    ...(profile ? [{ href: '/lots', label: t.nav.lots }, { href: '/dashboard', label: t.nav.dashboard }] : []),
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: t.nav.admin }] : []),
  ]

  return (
    <header className="bg-steel text-white sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label={APP_NAME}>
          <span className="grid place-items-center size-8 rounded-md bg-accent font-display font-extrabold text-[13px] tracking-tight">
            {APP_SHORT}
          </span>
          <span className="hidden md:block font-display font-bold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm ml-auto [scrollbar-width:none]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="px-2.5 py-1.5 rounded-md hover:bg-white/10 whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </nav>
        <LangSwitcher locale={locale} />
        {profile ? (
          <form action={signOut} className="hidden sm:block">
            <button className="text-sm px-2.5 py-1.5 rounded-md hover:bg-white/10">{t.nav.logout}</button>
          </form>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">{t.nav.login}</Link>
        )}
      </div>
    </header>
  )
}
