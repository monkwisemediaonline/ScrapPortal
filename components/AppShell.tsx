import Link from 'next/link'
import { APP_NAME, APP_SHORT, CITY } from '@/lib/config'
import { getProfile } from '@/lib/auth'
import { getDict } from '@/lib/i18n'
import { signOut } from '@/app/actions/auth'
import Icon from './Icon'
import LangSwitcher from './LangSwitcher'
import NavLink from './NavLink'

function Logo({ dark }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label={APP_NAME}>
      <span className="grid place-items-center size-9 rounded-xl bg-gradient-to-br from-[#2b6cf6] to-[#7a4cf0] text-white font-display font-extrabold text-[13px] tracking-tight shadow-sm">
        {APP_SHORT}
      </span>
      <span className={`hidden sm:block font-display font-bold tracking-tight leading-tight ${dark ? 'text-white' : 'text-ink'}`}>{APP_NAME}</span>
    </Link>
  )
}

/**
 * Signed out: a simple top bar. Signed in: app layout with a left sidebar on desktop
 * and a bottom tab bar on phones.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const [{ t, locale }, { profile }] = await Promise.all([getDict(), getProfile()])

  if (!profile) {
    return (
      <>
        <header className="bg-surface border-b border-line sticky top-0 z-30">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
            <Logo />
            <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
              <Link href="/rates" className="hidden sm:block px-3 py-2 rounded-lg hover:bg-bg">{t.nav.rates}</Link>
            </nav>
            <LangSwitcher locale={locale} />
            <Link href="/login" className="btn btn-ghost btn-sm">{t.nav.login}</Link>
            <Link href="/login?mode=signup" className="btn btn-primary btn-sm hidden sm:inline-flex">{t.login.signUp}</Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16 bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col sm:flex-row gap-2 justify-between">
            <span>© {new Date().getFullYear()} {APP_NAME}</span>
            <span>{CITY}, Punjab</span>
          </div>
        </footer>
      </>
    )
  }

  const isAdmin = profile.role === 'admin'
  return (
    <div className="flex-1 lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden lg:flex flex-col bg-steel text-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 h-16 flex items-center border-b border-white/10">
          <Logo dark />
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <NavLink href="/dashboard" icon="home" label={t.nav.dashboard} />
          <NavLink href="/rates" icon="chart" label={t.nav.rates} />
          <NavLink href="/sell" icon="tag" label={t.account.quickSell} />
          <NavLink href="/lots" icon="gavel" label={t.nav.lots} except="/lots/new" />
          <NavLink href="/lots/new" icon="plus" label={t.account.newLot} />
          {isAdmin && (
            <>
              <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{t.nav.admin}</p>
              <NavLink href="/admin" icon="gauge" label="Overview" exact />
              <NavLink href="/admin/rates" icon="rupee" label="Daily rates" />
              <NavLink href="/admin/requests" icon="inbox" label="Sell requests" />
              <NavLink href="/admin/members" icon="users" label="Members" />
              <NavLink href="/admin/lots" icon="gavel" label="Auctions" />
              <NavLink href="/admin/deals" icon="check" label="Deals" />
              <NavLink href="/admin/sources" icon="building" label="Rate sources" />
              <NavLink href="/admin/catalog" icon="grid" label="Catalog" />
            </>
          )}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold truncate">{profile.business_name ?? profile.full_name}</p>
            <p className="text-xs text-white/50 tabular">{profile.public_code}</p>
          </div>
          <form action={signOut}>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white">
              <Icon name="logout" />
              {t.nav.logout}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        <header className="bg-surface border-b border-line sticky top-0 z-30">
          <div className="px-4 lg:px-6 h-14 lg:h-16 flex items-center gap-3">
            <div className="lg:hidden"><Logo /></div>
            <div className="ml-auto flex items-center gap-2">
              <LangSwitcher locale={locale} />
              <form action={signOut} className="lg:hidden">
                <button className="grid place-items-center size-9 rounded-lg text-muted hover:bg-bg" aria-label={t.nav.logout}>
                  <Icon name="logout" />
                </button>
              </form>
              <Link href="/dashboard" className="hidden lg:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-line hover:bg-bg">
                <span className="tone-blue icon-tile size-7 rounded-full!"><Icon name="user" size={15} /></span>
                <span className="text-sm font-medium">{profile.full_name?.split(' ')[0] ?? t.nav.dashboard}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-8">{children}</main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line flex">
          <NavLink variant="bottom" href="/dashboard" icon="home" label={t.nav.home} />
          <NavLink variant="bottom" href="/rates" icon="chart" label={t.nav.ratesShort} />
          <NavLink variant="bottom" href="/sell" icon="tag" label={t.nav.sell} />
          <NavLink variant="bottom" href="/lots" icon="gavel" label={t.nav.lots} />
          {isAdmin && <NavLink variant="bottom" href="/admin" icon="gauge" label={t.nav.admin} />}
        </nav>
      </div>
    </div>
  )
}
