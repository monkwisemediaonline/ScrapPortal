import Link from 'next/link'
import Icon, { type IconName } from '@/components/Icon'
import RateBoard from '@/components/RateBoard'
import { getBoard, supabaseConfigured } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { getProfile } from '@/lib/auth'
import { rupees } from '@/lib/format'
import { categoryStyle } from '@/lib/tones'

export default async function Home() {
  const [{ t, locale }, { categories, entries }, { profile }] = await Promise.all([getDict(), getBoard(), getProfile()])
  const priced = entries.filter((e) => e.row)
  const sellHref = profile ? '/dashboard' : '/login?mode=signup'

  const methods: { n: string; tone: string; icon: IconName; title: string; body: string }[] = [
    { n: '01', tone: 'tone-green', icon: 'tag', title: t.home.m1Title, body: t.home.m1Body },
    { n: '02', tone: 'tone-orange', icon: 'gavel', title: t.home.m2Title, body: t.home.m2Body },
  ]
  const trust: { tone: string; icon: IconName; text: string }[] = [
    { tone: 'tone-blue', icon: 'shield', text: t.home.trust1 },
    { tone: 'tone-purple', icon: 'lock', text: t.home.trust2 },
    { tone: 'tone-teal', icon: 'scale', text: t.home.trust3 },
  ]

  return (
    <>
      {!supabaseConfigured && (
        <div className="bg-warn-soft text-sm text-center px-4 py-2">
          Supabase is not connected yet. Copy <code>.env.example</code> to <code>.env.local</code> (see README).
        </div>
      )}

      {/* Live ticker */}
      {priced.length > 0 && (
        <div className="bg-steel text-white/85 text-sm overflow-hidden" aria-label={t.home.boardTitle}>
          <div className="ticker-track flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex" aria-hidden={copy === 1}>
                {priced.map(({ grade, row }) => {
                  const diff = row!.prev_price === null ? 0 : Number(row!.best_price) - Number(row!.prev_price)
                  return (
                    <span key={grade.id} className="px-4 py-2 whitespace-nowrap tabular">
                      {localName(grade, locale)} <b className="text-white">{rupees(row!.best_price)}</b>
                      {diff !== 0 && (
                        <span className={diff > 0 ? 'text-[#5fe39a]' : 'text-[#ff8a80]'}> {diff > 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(2)}</span>
                      )}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero-bg text-white">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 md:pt-16 md:pb-24 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 pill bg-white/15 text-white mb-5 py-1!">
              <span className="size-2 rounded-full bg-[#5fe39a]" />
              {t.home.badge}
            </p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[1.08] tracking-tight">{t.home.title}</h1>
            <p className="mt-5 text-white/80 text-lg max-w-xl">{t.home.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rates" className="btn bg-white text-accent hover:bg-white/90">{t.home.ctaRates}</Link>
              <Link href={sellHref} className="btn btn-success">{t.home.ctaSell}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {categories.map((c) => {
                const s = categoryStyle(c.slug)
                return (
                  <Link key={c.id} href={`/rates?cat=${c.slug}`} className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 pl-2 pr-3 py-1 text-xs font-medium">
                    <Icon name={s.icon} size={14} />
                    {localName(c, locale)}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="grid gap-3">
            {methods.map((m) => (
              <div key={m.n} className={`${m.tone} rounded-2xl bg-white text-ink p-5 shadow-lg`}>
                <div className="flex items-center gap-3">
                  <span className="icon-tile size-11"><Icon name={m.icon} size={22} /></span>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-tone">{m.n}</span>
                    <h2 className="font-display font-bold text-lg leading-tight">{m.title}</h2>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Board */}
      <section className="mx-auto max-w-6xl px-4 -mt-10">
        <div className="card p-4 md:p-6 shadow-md!">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-extrabold text-2xl">{t.home.boardTitle}</h2>
              <p className="text-muted text-sm mt-1">{t.home.boardSub}</p>
            </div>
            <Link href="/rates" className="btn btn-ghost btn-sm">{t.common.viewAll} →</Link>
          </div>
          <RateBoard categories={categories} entries={entries} t={t} locale={locale} limitPerCategory={4} />
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 mt-8 grid sm:grid-cols-3 gap-3">
        {trust.map((s) => (
          <div key={s.text} className={`${s.tone} flex items-center gap-3 card px-4 py-4`}>
            <span className="icon-tile size-10"><Icon name={s.icon} size={20} /></span>
            <span className="font-medium text-sm">{s.text}</span>
          </div>
        ))}
      </section>
    </>
  )
}
