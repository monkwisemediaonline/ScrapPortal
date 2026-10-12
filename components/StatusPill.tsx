const TONES = {
  green: 'bg-ok-soft text-up',
  amber: 'bg-warn-soft text-[#8a6100]',
  red: 'bg-[#fdecea] text-down',
  grey: 'bg-[#e8edf6] text-muted',
  orange: 'bg-accent-soft text-accent',
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  approved: 'green', completed: 'green', converted: 'green', accepted: 'green', awarded: 'green',
  pending: 'amber', contacted: 'amber', payment_pending: 'amber', pickup_scheduled: 'amber', weighed: 'amber', choosing: 'amber',
  new: 'orange', open: 'orange', confirmed: 'orange', active: 'orange',
  rejected: 'red', suspended: 'red',
  cancelled: 'grey', withdrawn: 'grey', incomplete: 'grey',
}

export default function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill ${TONES[STATUS_TONE[status] ?? 'grey']}`}>{label ?? status.replace(/_/g, ' ')}</span>
}
