export type Unit = 'kg' | 'tonne' | 'piece'
export type Role = 'seller' | 'buyer' | 'both' | 'admin'
export type MemberStatus = 'incomplete' | 'pending' | 'approved' | 'rejected' | 'suspended'

export type Profile = {
  id: string
  phone: string | null
  email: string | null
  full_name: string | null
  business_name: string | null
  gstin: string | null
  role: Role
  status: MemberStatus
  area: string | null
  address: string | null
  public_code: string
  admin_note: string | null
  created_at: string
}

export type Category = { id: string; slug: string; name_en: string; name_hi: string | null; name_pa: string | null; sort: number; active: boolean }
export type Grade = {
  id: string; category_id: string; slug: string; name_en: string; name_hi: string | null; name_pa: string | null
  description: string | null; unit: Unit; sort: number; active: boolean
}
export type RateSource = { id: string; public_label: string; location: string | null; buyer_id: string | null; active: boolean }
export type Rate = { id: string; grade_id: string; source_id: string; price: number; unit: Unit; rate_date: string; note: string | null }
export type BoardRow = { grade_id: string; latest_date: string; best_price: number; prev_price: number | null; source_count: number }

export type SellRequestStatus = 'new' | 'contacted' | 'converted' | 'rejected' | 'cancelled'
export type SellRequest = {
  id: string; seller_id: string; grade_id: string; source_id: string | null; rate_id: string | null
  quoted_price: number | null; unit: Unit; quantity: number; quantity_unit: Unit; area: string | null
  pickup_address: string | null; photos: string[]; notes: string | null; status: SellRequestStatus
  admin_note: string | null; deal_id: string | null; created_at: string
}

export type LotStatus = 'open' | 'awarded' | 'cancelled'
export type Lot = {
  id: string; seller_id: string; grade_id: string; title: string; description: string | null
  quantity: number; quantity_unit: Unit; price_unit: Unit; min_rate: number | null; area: string | null
  inspection_note: string | null; photos: string[]; closes_at: string; status: LotStatus
  awarded_bid_id: string | null; created_at: string
}
export type BidStatus = 'active' | 'withdrawn' | 'accepted' | 'rejected'
export type Bid = { id: string; lot_id: string; buyer_id: string; rate: number; note: string | null; status: BidStatus; created_at: string; updated_at: string }

export type DealStatus = 'confirmed' | 'pickup_scheduled' | 'weighed' | 'payment_pending' | 'completed' | 'cancelled'
export const DEAL_STATUSES: DealStatus[] = ['confirmed', 'pickup_scheduled', 'weighed', 'payment_pending', 'completed', 'cancelled']
export type Deal = {
  id: string; origin: 'rate_card' | 'auction'; sell_request_id: string | null; lot_id: string | null; bid_id: string | null
  seller_id: string; buyer_id: string | null; source_id: string | null; grade_id: string; agreed_rate: number; unit: Unit
  est_quantity: number | null; quantity_unit: Unit; pickup_address: string | null; pickup_date: string | null
  final_weight_kg: number | null; deduction_amount: number; deduction_note: string | null; final_amount: number | null
  weighbridge_slip: string | null; status: DealStatus; created_at: string; updated_at: string
}

export type ActionState = { error?: string; ok?: string } | undefined
