import { APP_NAME } from '@/lib/config'
import { num, rupees, shortDate } from '@/lib/format'
import { invoiceTotals, rupeesInWords, type InvoiceParty } from '@/lib/invoice'
import type { Deal } from '@/lib/types'

/**
 * The seller's bill to the buyer, prepared by the exchange on the seller's behalf.
 * Kept in English, as tax documents normally are. A4-friendly; prints without the app frame.
 */
export default function InvoiceSheet({
  deal,
  gradeName,
  seller,
  buyer,
}: {
  deal: Deal
  gradeName: string
  seller: InvoiceParty | undefined
  buyer: InvoiceParty | undefined
}) {
  const money = invoiceTotals(deal, seller?.gstin ?? null, buyer?.gstin ?? null)
  const weight = Number(deal.final_weight_kg ?? 0)
  const gross = Math.round((money.taxable + Number(deal.deduction_amount)) * 100) / 100
  const cell = 'border border-[#c9d2e0] px-3 py-2 align-top'

  return (
    <div className="bg-white text-[#111] mx-auto max-w-[800px] p-8 text-sm leading-relaxed shadow-sm print:shadow-none print:p-0">
      <div className="flex justify-between items-start gap-6 border-b-2 border-[#111] pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl">{money.taxed ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</h1>
          <p className="text-xs text-[#555] mt-1">Issued by the seller. Prepared through {APP_NAME}.</p>
        </div>
        <table className="text-right tabular">
          <tbody>
            <tr><td className="pr-3 text-[#555]">Invoice no.</td><td className="font-bold">{deal.invoice_no}</td></tr>
            <tr><td className="pr-3 text-[#555]">Date</td><td className="font-bold">{deal.invoice_date ? shortDate(deal.invoice_date) + ' ' + deal.invoice_date.slice(0, 4) : ''}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-5">
        <Party title="Seller (bill from)" p={seller} />
        {buyer ? (
          <Party title="Buyer (bill to)" p={buyer} />
        ) : (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#555]">Buyer (bill to)</p>
            <p className="whitespace-pre-line mt-1 font-semibold">{deal.buyer_billing || 'Buyer details to be added by the exchange'}</p>
          </div>
        )}
      </div>

      <table className="w-full border-collapse mt-6 tabular">
        <thead>
          <tr className="bg-[#eef2f9] text-left">
            <th className={cell}>Description</th>
            <th className={cell}>HSN</th>
            <th className={`${cell} text-right`}>Weight (kg)</th>
            <th className={`${cell} text-right`}>Rate</th>
            <th className={`${cell} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cell}>{gradeName} scrap</td>
            <td className={cell}>{deal.hsn_code ?? '—'}</td>
            <td className={`${cell} text-right`}>{num(weight)}</td>
            <td className={`${cell} text-right`}>{rupees(deal.agreed_rate)}/{deal.unit}</td>
            <td className={`${cell} text-right`}>{rupees(gross)}</td>
          </tr>
          {Number(deal.deduction_amount) > 0 && (
            <tr>
              <td className={cell} colSpan={4}>Less: deduction{deal.deduction_note ? ` (${deal.deduction_note})` : ''}</td>
              <td className={`${cell} text-right`}>− {rupees(deal.deduction_amount)}</td>
            </tr>
          )}
          <Total label={money.taxed ? 'Taxable value' : 'Total'} value={money.taxable} cell={cell} bold={!money.taxed} />
          {money.taxed && money.igst > 0 && <Total label={`IGST @ ${money.percent}%`} value={money.igst} cell={cell} />}
          {money.taxed && money.igst === 0 && <Total label={`CGST @ ${money.percent / 2}%`} value={money.cgst} cell={cell} />}
          {money.taxed && money.igst === 0 && <Total label={`SGST @ ${money.percent / 2}%`} value={money.sgst} cell={cell} />}
          {money.taxed && <Total label="Invoice total" value={money.total} cell={cell} bold />}
        </tbody>
      </table>

      <p className="mt-3"><span className="text-[#555]">Amount in words:</span> <b>{rupeesInWords(money.total)}</b></p>
      {deal.payment_ref && (
        <p className="mt-1"><span className="text-[#555]">Payment reference:</span> <span className="tabular">{deal.payment_ref}</span>{deal.payment_confirmed_at ? ' (received)' : ''}</p>
      )}

      <div className="flex justify-between items-end mt-12">
        <p className="text-xs text-[#555] max-w-[55%]">
          Weight as per weighbridge slip. This document is generated on the seller&apos;s behalf from deal records on {APP_NAME}.
        </p>
        <div className="text-center">
          <div className="h-12" />
          <p className="border-t border-[#111] pt-1 px-6">For {seller?.business_name ?? seller?.name ?? 'Seller'}</p>
          <p className="text-xs text-[#555]">Authorised signatory</p>
        </div>
      </div>
    </div>
  )
}

function Party({ title, p }: { title: string; p: InvoiceParty | undefined }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#555]">{title}</p>
      <p className="font-bold text-base mt-1">{p?.business_name ?? p?.name ?? '—'}</p>
      {p?.address && <p className="whitespace-pre-line">{p.address}</p>}
      <p className="tabular">GSTIN: {p?.gstin ?? 'Unregistered'}</p>
      {p?.phone && <p className="tabular">Phone: +{p.phone.replace(/^\+/, '')}</p>}
    </div>
  )
}

function Total({ label, value, cell, bold }: { label: string; value: number; cell: string; bold?: boolean }) {
  return (
    <tr className={bold ? 'font-bold bg-[#f6f8fc]' : ''}>
      <td className={`${cell} text-right`} colSpan={4}>{label}</td>
      <td className={`${cell} text-right`}>{rupees(value)}</td>
    </tr>
  )
}
