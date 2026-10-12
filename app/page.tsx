import Link from 'next/link'
import RateBoard from '@/components/RateBoard'
import { getBoard, supabaseConfigured } from '@/lib/data'
import { getDict, localName } from '@/lib/i18n'
import { getProfile } from '@/lib/auth'
import { rupees } from '@/lib/format'

export default async function Home() {
  const [{ t, locale }, { categories, entries }, { profile }] = await Promise.all([getDict(), getBoard(), getProfile()])
  const priced = entries.filter((e) => e.row)
  const sellHref = profile ? '/dashboard' : '/login?mode=signup'

  return (
    <>
      {!supabaseConfigured && (
        <div className="bg-warn-soft text-sm text-center px-4 py-2">
          Supabase is not connected yet. Copy <code>.env.example</code> to <code>.env.local</code> (see README).
        </div>
      )}

      {/* Live ticker */}
      {priced.length > 0 && (
        <div className="bg-steel-2 text-white/90 text-sm overflow-hidden border-t border-white/5" aria-label={t.home.boardTitle}>
          <div className="ticker-track flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex" aria-hidden={copy === 1}>
                {priced.map(({ grade, row }) => {
                  const diff = row!.prev_price === null ? 0 : Number(row!.best_price) - Number(row!.prev_price)
                  return (
                    <span key={grade.id} className="px-4 py-2 whitespace-nowrap tabular">
                      {localName(grade, locale)} <b className="text-white">{rupees(row!.best_price)}</b>
                      {diff !== 0 && (
                        <span className={diff > 0 ? 'text-[#5fd38d]' : 'text-[#ff8a80]'}> {diff > 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(2)}</span>
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
      <section className="bg-steel text-white">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-16 md:pb-20 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <p className="inline-block pill bg-white/10 text-white/90 mb-5">{t.home.badge}</p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[1.08] tracking-tight">{t.home.title}</h1>
            <p className="mt-5 text-white/75 text-lg max-w-xl">{t.home.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rates" className="btn btn-primary">{t.home.ctaRates}</Link>
              <Link href={sellHref} className="btn bg-white text-steel hover:bg-white/90">{t.home.ctaSell}</Link>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              { n: '01', title: t.home.m1Title, body: t.home.m1Body },
              { n: '02', title: t.home.m2Title, body: t.home.m2Body },
            ].map((m) => (
              <div key={m.n} className="rounded-xl bg-white/[.06] border border-white/10 p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display font-extrabold text-accent">{m.n}</span>
                  <h2 className="font-display font-bold text-lg">{m.title}</h2>
                </div>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Board */}
      <section className="mx-auto max-w-6xl px-4 -mt-8">
        <div className="card p-4 md:p-6 shadow-sm">
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
      <section className="mx-auto max-w-6xl px-4 mt-10 grid sm:grid-cols-3 gap-3">
        {[t.home.trust1, t.home.trust2, t.home.trust3].map((s) => (
          <div key={s} className="flex items-center gap-3 card px-4 py-4">
            <span className="grid place-items-center size-8 rounded-full bg-ok-soft text-up font-bold shrink-0">✓</span>
            <span className="font-medium text-sm">{s}</span>
          </div>
        ))}
      </section>
    </>
  )
}
