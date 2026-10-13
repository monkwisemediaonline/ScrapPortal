import Icon, { type IconName } from './Icon'

/** Coloured page heading with a big icon. `color` is one of the grad-* classes. */
export function PageBanner({
  color,
  icon,
  title,
  sub,
  children,
}: {
  color: string
  icon: IconName
  title: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`grad ${color} rounded-2xl p-5 flex flex-wrap items-center gap-4`}>
      <span className="grid place-items-center size-14 rounded-2xl bg-white/20 shrink-0"><Icon name={icon} size={30} /></span>
      <div className="flex-1 min-w-[12rem]">
        <h1 className="font-display font-extrabold text-2xl leading-tight">{title}</h1>
        {sub && <p className="text-white/85 text-sm mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/** One numbered step of a form: big number, plain-language question, then the fields. */
export function Step({ n, tone, title, children }: { n: number; tone: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${tone} card p-4 md:p-5`}>
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3 mb-4">
        <span className="grid place-items-center size-9 rounded-full bg-tone text-white font-display font-extrabold shrink-0">{n}</span>
        <h2 className="font-display font-bold text-lg leading-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

/** Large tap-friendly choice buttons (radio group), e.g. kg / tonne. */
export function Choice({
  name,
  options,
  defaultValue,
  label,
}: {
  name: string
  options: { value: string; label: string }[]
  defaultValue: string
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex-1 min-w-[5rem] text-center rounded-xl border-2 border-line bg-surface px-3 py-3 font-semibold cursor-pointer has-checked:border-tone has-checked:bg-tone-soft has-checked:text-tone has-focus-visible:outline-2 has-focus-visible:outline-tone"
          >
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}
