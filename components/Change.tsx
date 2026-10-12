/** ▲ / ▼ day-over-day change badge. */
export default function Change({ now, prev }: { now: number; prev: number | null }) {
  if (prev === null || prev === undefined) return <span className="text-muted text-sm">—</span>
  const diff = Number(now) - Number(prev)
  if (Math.abs(diff) < 0.005) return <span className="text-muted text-sm tabular">0.00</span>
  const up = diff > 0
  return (
    <span className={`text-sm font-semibold tabular ${up ? 'text-up' : 'text-down'}`}>
      {up ? '▲' : '▼'} {Math.abs(diff).toFixed(2)}
    </span>
  )
}
