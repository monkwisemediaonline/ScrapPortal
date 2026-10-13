import Link from 'next/link'
import { headers } from 'next/headers'
import { APP_NAME, APP_SHORT, CITY } from '@/lib/config'
import { getProfile } from '@/lib/auth'
import { getDict, type Dict, type Locale } from '@/lib/i18n'
import { signOut } from '@/app/actions/auth'
import Icon from './Icon'
import LangSwitcher from './LangSwitcher'
import NavLink from './NavLink'

function Logo({ dark, href = '/' }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 min-w-0" aria-label={APP_NAME}>
      <span className="grid place-items-center size-9 shrink-0 rounded-xl bg-gradient-to-br from-[#2b6cf6] to-[#7a4cf0] text-white font-display font-extrabold text-[13px] tracking-tight shadow-sm">
        {APP_SHORT}
      </span>
      <span className={`hidden sm:block font-display font-bold tracking-tight leading-[1.15] text-[15px] ${dark ? 'text-white' : 'text-ink'}`}>{APP_NAME}</span>
    </Link>
  )
}

/** Picks the right frame for the visitor: public top bar, or the signed-in app layout. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  // The component preview page brings its own frame
  if ((await headers()).get('x-pathname')?.startsWith('/dev-ui')) return <>{children}</>

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

  return (
    <MemberShell
      t={t}
      locale={locale}
      isAdmin={profile.role === 'admin'}
      name={profile.full_name?.split(' ')[0] ?? ''}
      business={profile.business_name ?? profile.full_name ?? ''}
      code={profile.public_code}
    >
      {children}
    </MemberShell>
  )
}

/**
 * Signed-in frame: sidebar on desktop, bottom tab bar on phones.
 * Admins get a purple sidebar with the admin tools first, so the role is obvious at a glance.
 */
export function MemberShell({
  t,
  locale,
  isAdmin,
  name,
  business,
  code,
  children,
}: {
  t: Dict
  locale: Locale
  isAdmin: boolean
  name: string
  business: string
  code: string
  children: React.ReactNode
}) {
  const marketLinks = (
    <>
      <NavLink href="/" icon="home" label={t.nav.website} exact />
      <NavLink href={isAdmin ? '/dashboard?view=me' : '/dashboard'} icon="user" label={t.nav.account} />
      <NavLink href="/rates" icon="chart" label={t.nav.rates} />
      <NavLink href="/sell" icon="tag" label={t.account.bigSell} />
      <NavLink href="/lots" icon="gavel" label={t.nav.lots} except="/lots/new" />
      <NavLink href="/lots/new" icon="plus" label={t.account.bigAuction} />
    </>
  )

  return (
    <div className="flex-1 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className={`hidden lg:flex flex-col text-white sticky top-0 h-screen overflow-y-auto ${isAdmin ? 'side-admin' : 'side-member'}`}>
        <div className="px-4 h-16 flex items-center border-b border-white/10 shrink-0">
          <Logo dark href={isAdmin ? '/admin' : '/dashboard'} />
        </div>

        {isAdmin && (
          <div className="mx-3 mt-3 rounded-xl bg-white/15 px-3 py-2.5 flex items-center gap-2.5">
            <span className="grid place-items-center size-8 rounded-lg bg-white text-[#6d28d9]"><Icon name="shield" /></span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Admin Panel</p>
              <p className="text-[11px] text-white/70">You manage this portal</p>
            </div>
          </div>
        )}

        <nav className="p-3 space-y-1 flex-1">
          {isAdmin ? (
            <>
              <NavLink href="/admin" icon="gauge" label="Dashboard" exact />
              <NavLink href="/admin/rates" icon="rupee" label="Post daily rates" />
              <NavLink href="/admin/requests" icon="inbox" label="Sell requests" />
              <NavLink href="/admin/members" icon="users" label="Members" />
              <NavLink href="/admin/lots" icon="gavel" label="Auctions" />
              <NavLink href="/admin/deals" icon="check" label="Deals" />
              <NavLink href="/admin/sources" icon="building" label="Rate sources" />
              <NavLink href="/admin/catalog" icon="grid" label="Scrap catalog" />
              <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">Marketplace</p>
              {marketLinks}
            </>
          ) : (
            marketLinks
          )}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold truncate">{business}</p>
            <p className="text-xs text-white/60 tabular">{code}</p>
          </div>
          <form action={signOut}>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white">
              <Icon name="logout" />
              {t.nav.logout}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        <header className="bg-surface border-b border-line sticky top-0 z-30">
          <div className="px-4 lg:px-6 h-14 lg:h-16 flex items-center gap-3">
            <div className="lg:hidden"><Logo href={isAdmin ? '/admin' : '/dashboard'} /></div>
            {isAdmin && (
              <span className="pill bg-[#efe8ff] text-[#6d28d9] py-1! px-3! text-xs!">
                <Icon name="shield" size={14} /> Admin
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <LangSwitcher locale={locale} />
              <form action={signOut} className="lg:hidden">
                <button className="grid place-items-center size-9 rounded-lg text-muted hover:bg-bg" aria-label={t.nav.logout}>
                  <Icon name="logout" />
                </button>
              </form>
              <Link href={isAdmin ? '/dashboard?view=me' : '/dashboard'} className="hidden lg:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-line hover:bg-bg">
                <span className="tone-blue icon-tile size-7 rounded-full!"><Icon name="user" size={15} /></span>
                <span className="text-sm font-medium">{name || t.nav.account}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-8">{children}</main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line flex shadow-[0_-2px_10px_rgb(24_32_58/0.06)]">
          {isAdmin ? (
            <>
              <NavLink variant="bottom" href="/admin" icon="gauge" label="Admin" exact />
              <NavLink variant="bottom" href="/admin/rates" icon="rupee" label="Rates" />
              <NavLink variant="bottom" href="/admin/requests" icon="inbox" label="Requests" />
              <NavLink variant="bottom" href="/admin/deals" icon="check" label="Deals" />
              <NavLink variant="bottom" href="/dashboard?view=me" icon="user" label={t.nav.account} />
            </>
          ) : (
            <>
              <NavLink variant="bottom" href="/dashboard" icon="home" label={t.nav.home} />
              <NavLink variant="bottom" href="/rates" icon="chart" label={t.nav.ratesShort} />
              <NavLink variant="bottom" href="/sell" icon="tag" label={t.nav.sell} />
              <NavLink variant="bottom" href="/lots" icon="gavel" label={t.nav.lots} />
            </>
          )}
        </nav>
      </div>
    </div>
  )
}
