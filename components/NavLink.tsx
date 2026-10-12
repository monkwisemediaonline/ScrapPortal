'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from './Icon'

/**
 * Sidebar / bottom-bar link that highlights itself for the current page.
 * `exact` matches only the href itself; `except` lets /lots stay inactive on /lots/new.
 */
export default function NavLink({
  href,
  label,
  icon,
  variant = 'side',
  exact,
  except,
}: {
  href: string
  label: string
  icon: IconName
  variant?: 'side' | 'bottom'
  exact?: boolean
  except?: string
}) {
  const pathname = usePathname()
  const active =
    pathname === href || (!exact && pathname.startsWith(href + '/') && !(except && pathname.startsWith(except)))

  if (variant === 'bottom') {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-accent' : 'text-muted'}`}
      >
        <Icon name={icon} size={20} />
        <span className="truncate max-w-full px-1">{label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-accent text-white font-semibold shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon name={icon} />
      <span className="truncate">{label}</span>
    </Link>
  )
}
