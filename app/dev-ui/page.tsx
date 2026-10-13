import { notFound } from 'next/navigation'
import { MemberShell } from '@/components/AppShell'
import AdminOverview from '@/components/AdminOverview'
import AdminProfile from '@/components/AdminProfile'
import DealView from '@/components/DealView'
import FinanceView from '@/components/FinanceView'
import type { FinanceRow } from '@/lib/finance'
import InvoiceSheet from '@/components/InvoiceSheet'
import MemberHome from '@/components/MemberHome'
import { LotForm, SellForm } from '@/components/TradeForms'
import { getDict } from '@/lib/i18n'
import type { InvoiceParty } from '@/lib/invoice'
import type { Deal, Grade, Lot, SellRequest } from '@/lib/types'

// Design preview of the signed-in screens with made-up data, for checking layout during
// development: /dev-ui?view=admin | member | sell | lot | deal | deal-seller | deal-admin | invoice.
// It reads nothing from the database and does not exist in production.
export default async function DevUi({ searchParams }: PageProps<'/dev-ui'>) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { view: rawView } = await searchParams
  const view = typeof rawView === 'string' ? rawView : 'admin'
  const { t, locale } = await getDict()
  const admin = ['admin', 'deal-admin', 'finance', 'profile'].includes(view)
  const now = '2026-10-13T09:30:00+05:30'

  const grade = { id: 'g1', category_id: 'c1', slug: 'hms-1', name_en: 'HMS-1 (Heavy Melting)', name_hi: 'HMS-1 (भारी मेल्टिंग)', name_pa: 'HMS-1 (ਭਾਰੀ ਮੈਲਟਿੰਗ)', description: null, unit: 'kg', sort: 1, active: true } satisfies Grade
  const deal = {
    id: 'd1', origin: 'auction', lot_id: 'l1', seller_id: 'seller', buyer_id: 'buyer', grade_id: 'g1', agreed_rate: 33.52, unit: 'kg',
    est_quantity: 8, quantity_unit: 'tonne', pickup_date: '2026-10-14', final_weight_kg: 7950, deduction_amount: 500, deduction_note: 'Dust',
    final_amount: 265984, weighbridge_slip: null, status: view === 'deal-seller' ? 'payment_pending' : 'weighed', created_at: now,
    commission_percent: 0.25, commission_amount: 664.96, gst_percent: 18, hsn_code: '7204', invoice_no: 'LSX/2610/0001', invoice_date: '2026-10-14',
    buyer_billing: null, payment_ref: view === 'deal-seller' ? 'UTR2610140098' : null, payment_proof: null,
    paid_at: view === 'deal-seller' ? now : null, payment_confirmed_at: null,
  } as Deal
  const request = { id: 'r1', grade_id: 'g1', quantity: 2000, quantity_unit: 'kg', quoted_price: 33.52, unit: 'kg', status: 'new', deal_id: null, created_at: now } as SellRequest
  const lot = { id: 'l1', grade_id: 'g1', title: '8 tonne HMS-1 cutting, Focal Point', closes_at: '2026-10-15T18:00:00+05:30', status: 'open' } as Lot
  const parties: InvoiceParty[] = [
    { party: 'seller', business_name: 'Sharma Forgings', name: 'Rajesh Sharma', gstin: '03ABCDE1234F1Z5', address: 'Plot 214, Focal Point Phase 8, Ludhiana', phone: '919876500001' },
    { party: 'buyer', business_name: 'Gill Steel Traders', name: 'Harpreet Gill', gstin: '03PQRSX5678K1Z2', address: 'GT Road, Mandi Gobindgarh', phone: '919876500002' },
  ]
  const groups = [{ label: 'Iron & Steel', grades: [{ id: 'g1', label: 'HMS-1 (Heavy Melting)', unit: 'kg' }, { id: 'g2', label: 'HMS-2', unit: 'kg' }] }]
  const formProps = { t, groups, rates: { g1: '₹33.52/kg' }, area: 'Focal Point', address: 'Plot 214, Focal Point Phase 8' }

  let body: React.ReactNode
  const fin = (i: number, over: Partial<FinanceRow>): FinanceRow => ({
    id: 'f' + i, date: '2026-10-1' + (4 - (i % 3)), invoiceNo: 'LSX/2610/000' + i, origin: i % 2 ? 'auction' : 'rate_card', grade: 'HMS-1 (Heavy Melting)',
    seller: 'Sharma Forgings', buyer: 'Gill Steel Traders', weightKg: 7950, amount: 265984, gst: 47877.12, total: 313861.12, feePercent: 0.25, fee: 664.96,
    status: 'completed', paymentRef: 'UTR26101400' + i, paidAt: now, paymentConfirmedAt: now, feeReceivedAt: null, feeRef: null, ...over,
  })
  const finRows = [
    fin(1, { feeReceivedAt: now, feeRef: 'NEFT88213' }),
    fin(2, { grade: 'Cotton Katran – White', seller: 'Arora Hosiery', buyer: 'Panipat Recyclers', weightKg: 650, amount: 24700, gst: 1235, total: 25935, fee: 61.75 }),
    fin(3, { status: 'payment_pending', paymentConfirmedAt: null, grade: 'Copper', seller: 'Verma Cables', buyer: 'Off-portal (Brass unit, Jagraon)', weightKg: 310, amount: 230020, gst: 41403.6, total: 271423.6, fee: 575.05 }),
    fin(4, { status: 'confirmed', invoiceNo: null, weightKg: null, amount: 0, gst: 0, total: 0, fee: 0, paymentRef: null, paidAt: null, paymentConfirmedAt: null }),
  ]

  if (view === 'profile')
    body = (
      <AdminProfile
        profile={{ id: 'a', phone: '919056011120', email: 'admin@example.com', full_name: 'Monk Wise', business_name: 'Monk Wise Media', gstin: null, role: 'admin', status: 'approved', area: 'Ludhiana', address: 'Ludhiana', public_code: 'LSX-1002', admin_note: null, created_at: now }}
        stats={{ members: 18, deals: 7, feeEarned: '₹726.71' }}
      />
    )
  else if (view === 'finance') body = <div className="mx-auto max-w-6xl px-4 lg:px-6 py-6"><FinanceView rows={finRows} range="month" feeRate={0.25} /></div>
  else if (view === 'sell') body = <SellForm {...formProps} preselected="g1" />
  else if (view === 'lot') body = <LotForm {...formProps} />
  else if (view === 'invoice') body = <div className="px-4 py-6"><InvoiceSheet deal={deal} gradeName={grade.name_en} seller={parties[0]} buyer={parties[1]} /></div>
  else if (view.startsWith('deal'))
    body = (
      <DealView
        deal={deal}
        gradeName={grade.name_en}
        t={t}
        viewer={{ id: view === 'deal-seller' ? 'seller' : view === 'deal-admin' ? 'admin' : 'buyer', isAdmin: view === 'deal-admin' }}
        parties={parties}
        messages={[
          { id: 1, sender_id: 'buyer', body: 'Sat sri akal ji. Truck will reach by 4 pm tomorrow.', created_at: now },
          { id: 2, sender_id: 'seller', body: 'Theek hai. Loading labour is available here.', created_at: now },
        ]}
        events={[{ id: 1, status: 'confirmed', created_at: now }, { id: 2, status: 'weighed', created_at: now }]}
        supportPhone="+91 98765 43210"
      />
    )
  else if (admin)
    body = (
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
    )
  else
    body = (
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
    )

  return (
    <MemberShell t={t} locale={locale} isAdmin={admin} name="Monk" business="Monk Wise Media" code="LSX-1002">
      {body}
    </MemberShell>
  )
}
