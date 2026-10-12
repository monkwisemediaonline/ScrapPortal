/** Tiny inline trend line for a series of daily prices (oldest → newest). */
export default function Sparkline({ values, width = 320, height = 72 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 6
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / span) * (height - pad * 2)
    return [x, y] as const
  })
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const up = values[values.length - 1] >= values[0]
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Price trend">
      <path d={`${d} L${lx},${height} L${pts[0][0]},${height} Z`} fill={up ? 'var(--ok-soft)' : '#fdecea'} />
      <path d={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill={up ? 'var(--up)' : 'var(--down)'} />
    </svg>
  )
}
