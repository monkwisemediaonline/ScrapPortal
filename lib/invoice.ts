import type { Deal } from './types'

export type InvoiceParty = {
  party: 'seller' | 'buyer'
  business_name: string | null
  name: string | null
  gstin: string | null
  address: string | null
  phone: string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Money breakdown for a weighed deal.
 * GST is charged only when the seller has a GSTIN (otherwise it is a bill of supply).
 * Same state (first two GSTIN digits match, or buyer has no GSTIN) → CGST + SGST; otherwise IGST.
 */
export function invoiceTotals(deal: Pick<Deal, 'final_amount' | 'gst_percent'>, sellerGstin: string | null, buyerGstin: string | null) {
  const taxable = Number(deal.final_amount ?? 0)
  const taxed = Boolean(sellerGstin)
  const percent = taxed ? Number(deal.gst_percent ?? 0) : 0
  const gst = round2((taxable * percent) / 100)
  const interState = taxed && !!buyerGstin && buyerGstin.slice(0, 2) !== sellerGstin!.slice(0, 2)
  return {
    taxed,
    taxable,
    percent,
    gst,
    igst: interState ? gst : 0,
    cgst: interState ? 0 : round2(gst / 2),
    sgst: interState ? 0 : round2(gst - round2(gst / 2)),
    total: round2(taxable + gst),
  }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below100(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
}
function below1000(n: number) {
  return n < 100 ? below100(n) : `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + below100(n % 100) : ''}`
}

/** 262350.5 → "Rupees Two Lakh Sixty Two Thousand Three Hundred Fifty and Fifty Paise Only" */
export function rupeesInWords(amount: number) {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  const parts: string[] = []
  const crore = Math.floor(rupees / 1e7)
  const lakh = Math.floor((rupees % 1e7) / 1e5)
  const thousand = Math.floor((rupees % 1e5) / 1e3)
  const rest = rupees % 1e3
  if (crore) parts.push(`${below1000(crore)} Crore`)
  if (lakh) parts.push(`${below100(lakh)} Lakh`)
  if (thousand) parts.push(`${below100(thousand)} Thousand`)
  if (rest) parts.push(below1000(rest))
  const words = parts.join(' ') || 'Zero'
  return `Rupees ${words}${paise ? ` and ${below100(paise)} Paise` : ''} Only`
}
