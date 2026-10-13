import { notFound } from 'next/navigation'
import { MemberShell } from '@/components/AppShell'
import AdminOverview from '@/components/AdminOverview'
import MemberHome from '@/components/MemberHome'
import { getDict } from '@/lib/i18n'
import type { Deal, Grade, Lot, SellRequest } from '@/lib/types'

// Design preview of the signed-in screens with made-up data, for checking layout during
// development (/dev-ui?view=admin or ?view=member). It reads nothing from the database
// and does not exist in production.
export default async function DevUi({ searchParams }: PageProps<'/dev-ui'>) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { view } = await searchParams
  const { t, locale } = await getDict()
  const admin = view !== 'member'
  const now = '2026-10-13T09:30:00+05:30'

  const grade = { id: 'g1', category_id: 'c1', slug: 'hms-1', name_en: 'HMS-1 (Heavy Melting)', name_hi: 'HMS-1 (भारी मेल्टिंग)', name_pa: 'HMS-1 (ਭਾਰੀ ਮੈਲਟਿੰਗ)', description: null, unit: 'kg', sort: 1, active: true } satisfies Grade
  const deal = { id: 'd1', origin: 'rate_card', grade_id: 'g1', agreed_rate: 33.52, unit: 'kg', status: 'pickup_scheduled', created_at: now } as Deal
  const request = { id: 'r1', grade_id: 'g1', quantity: 2000, quantity_unit: 'kg', quoted_price: 33.52, unit: 'kg', status: 'new', deal_id: null, created_at: now } as SellRequest
  const lot = { id: 'l1', grade_id: 'g1', title: '8 tonne HMS-1 cutting, Focal Point', closes_at: '2026-10-15T18:00:00+05:30', status: 'open' } as Lot

  return (
    <MemberShell t={t} locale={locale} isAdmin={admin} name="Monk" business="Monk Wise Media" code="LSX-1002">
      {admin ? (
        <div className="mx-auto max-w-6xl px-4 lg:px-6 py-6">
          <AdminOverview
            name="Monk"
            today="13 Oct"
            counts={{ ratesToday: 0, grades: 23, newRequests: 3, pendingMembers: 2, openLots: 4, activeDeals: 1, members: 18, completedDeals: 6 }}
            requests={[
              { id: '1', grade: 'HMS-1 (Heavy Melting)', quantity: '2,000 kg', seller: 'Sharma Forgings', when: '13 Oct, 9:10 am', status: 'new' },
              { id: '2', grade: 'Cotton Katran – White', quantity: '650 kg', seller: 'Arora Hosiery', when: '12 Oct, 6:40 pm', status: 'contacted' },
            ]}
            pending={[
              { id: '1', name: 'Gill Steel Traders', role: 'buyer', when: '13 Oct, 8:05 am' },
              { id: '2', name: 'Verma Knitwears', role: 'seller', when: '12 Oct, 4:20 pm' },
            ]}
          />
        </div>
      ) : (
        <MemberHome
          profile={{ full_name: 'Rajesh Sharma', business_name: 'Sharma Forgings', public_code: 'LSX-1007', status: 'approved', role: 'both' }}
          t={t}
          locale={locale}
          grades={new Map([['g1', grade]])}
          topRates={[
            { slug: 'hms-1', name: 'HMS-1', price: 33.52, unit: t.units.kg },
            { slug: 'copper', name: 'Copper', price: 742, unit: t.units.kg },
            { slug: 'occ', name: 'Cartons / OCC', price: 14.5, unit: t.units.kg },
            { slug: 'cotton-white', name: 'Cotton Katran', price: 38, unit: t.units.kg },
          ]}
          deals={[deal]}
          requests={[request]}
          lots={[lot]}
          bids={[]}
        />
      )}
    </MemberShell>
  )
}
