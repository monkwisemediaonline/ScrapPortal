import type { IconName } from '@/components/Icon'

export type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'amber' | 'slate'

// Colour + icon per scrap category; unknown slugs (added in Admin → Catalog) fall back to green.
const CATEGORY_STYLE: Record<string, { tone: Tone; icon: IconName }> = {
  'iron-steel': { tone: 'blue', icon: 'layers' },
  'non-ferrous': { tone: 'amber', icon: 'coins' },
  cloth: { tone: 'pink', icon: 'shirt' },
  paper: { tone: 'orange', icon: 'box' },
  plastic: { tone: 'teal', icon: 'bottle' },
  other: { tone: 'purple', icon: 'recycle' },
}

export function categoryStyle(slug: string | undefined) {
  return CATEGORY_STYLE[slug ?? ''] ?? { tone: 'green' as Tone, icon: 'recycle' as IconName }
}
