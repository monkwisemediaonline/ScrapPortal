import StatusPill from './StatusPill'
import type { Dict } from '@/lib/i18n/en'
import type { Lot } from '@/lib/types'

export default function LotStatus({ lot, t }: { lot: Pick<Lot, 'status' | 'closes_at'>; t: Dict }) {
  if (lot.status === 'awarded') return <StatusPill status="awarded" label={t.lots.awarded} />
  if (lot.status === 'cancelled') return <StatusPill status="cancelled" label={t.lots.cancelled} />
  // Server-rendered snapshot; the lot page shows a live countdown
  // eslint-disable-next-line react-hooks/purity
  if (new Date(lot.closes_at).getTime() <= Date.now()) return <StatusPill status="choosing" label={t.lots.sellerChoosing} />
  return <StatusPill status="open" label={t.lots.open} />
}
