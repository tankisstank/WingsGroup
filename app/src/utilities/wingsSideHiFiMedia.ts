/** Runtime-safe WingSide hi-fi media catalog (no Node builtins). */

export const WINGSSIDE_HIFI_PUBLIC_PREFIX = '/wingsside-hifi'

export const wingsSideHiFiAssets = {
  adventure: { alt: 'Active Vietnam journey through mountain landscapes', file: 'adventure.jpg' },
  business: { alt: 'Business and MICE travel in Vietnam', file: 'business.jpg' },
  culture: { alt: 'Vietnam culture and heritage journey', file: 'culture.jpg' },
  family: { alt: 'Private family journey in Vietnam', file: 'family.jpg' },
  halong: { alt: 'Ha Long Bay limestone islands and water', file: 'halong.jpg' },
  hanoi: { alt: 'Ha Noi heritage streets and local atmosphere', file: 'hanoi.jpg' },
  heroHalong: { alt: 'Tailor-made Vietnam journey in Ha Long Bay', file: 'hero-halong.jpg' },
  hoian: { alt: 'Hoi An heritage town and lantern atmosphere', file: 'hoian.jpg' },
  hue: { alt: 'Hue imperial heritage in Central Vietnam', file: 'hue.jpg' },
  logo: { alt: 'Wingside wordmark', file: 'logo.png' },
  luxury: { alt: 'Luxury tailor-made Vietnam travel', file: 'luxury.jpg' },
  mekong: { alt: 'Mekong Delta waterways and local life', file: 'mekong.jpg' },
  planner: { alt: 'Local planner preparing a private Vietnam journey', file: 'planner.jpg' },
  sapa: { alt: 'Sapa mountain landscape in Northern Vietnam', file: 'sapa.jpg' },
  wellness: { alt: 'Wellness and recovery travel in Vietnam', file: 'wellness.jpg' },
} as const

export type WingsSideHiFiAssetKey = keyof typeof wingsSideHiFiAssets

export type WingsSideHiFiCardBinding = {
  asset: WingsSideHiFiAssetKey
  badge?: string
  body: string
  href: string
  title: string
}

export const wingsSideHiFiCardBindings = {
  destinations: [
    {
      asset: 'hanoi' as const,
      body: 'Heritage, food, and the northern gateway.',
      href: '/destinations/ha-noi',
      title: 'Hanoi',
    },
    {
      asset: 'halong' as const,
      body: 'Cruise rhythm and seascape contrast.',
      href: '/destinations/ha-long',
      title: 'Ha Long',
    },
    {
      asset: 'hoian' as const,
      body: 'Lantern streets and slower evenings.',
      href: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      asset: 'hue' as const,
      body: 'Citadel days and central heritage pairing.',
      href: '/destinations/hue',
      title: 'Hue',
    },
    {
      asset: 'mekong' as const,
      body: 'Delta rhythm with softer pacing.',
      href: '/destinations/mekong',
      title: 'Mekong',
    },
    {
      asset: 'sapa' as const,
      body: 'Highland terraces and cooler nights.',
      // No dedicated Sapa child page in seed/prod hub set yet — keep hub-safe.
      href: '/destinations',
      title: 'Sapa',
    },
  ],
  packages: [
    {
      asset: 'heroHalong' as const,
      badge: 'HOT PICK',
      body: 'A multi-region first trip frame.',
      href: '/packages/vietnam-highlights',
      title: 'Can one trip cover the icons — without the rush?',
    },
    {
      asset: 'sapa' as const,
      badge: 'BEST PRICE',
      body: 'North Vietnam in tighter focus.',
      href: '/packages/northern-vietnam',
      title: 'What does a deep North week actually feel like?',
    },
    {
      asset: 'hoian' as const,
      badge: 'POPULAR',
      body: 'A softer heritage-led route.',
      href: '/packages/central-heritage',
      title: 'Ready for citadel days and lantern nights?',
    },
    {
      asset: 'family' as const,
      badge: 'FAMILY FAVORITE',
      body: 'Fewer hotel changes and culture moments designed for every age.',
      href: '/packages/family-vietnam',
      title: 'Can grandparents and kids share one route?',
    },
    {
      asset: 'mekong' as const,
      badge: 'SOFT FINISH',
      body: 'Hoi An glow into Mekong orchards and river lodges.',
      href: '/packages#south',
      title: 'What if the last days felt slower, not smaller?',
    },
  ],
  routes: [
    {
      asset: 'hanoi' as const,
      body: 'Hanoi · Ha Long · highland contrast.',
      href: '/destinations/ha-noi',
      title: 'North gateway',
    },
    {
      asset: 'hue' as const,
      body: 'Hue and Hoi An without hotel fatigue.',
      href: '/destinations/hue',
      title: 'Central heritage',
    },
    {
      asset: 'mekong' as const,
      body: 'Mekong days with softer pacing.',
      href: '/destinations/mekong',
      title: 'Delta rhythm',
    },
  ],
  styles: [
    {
      asset: 'luxury' as const,
      body: 'Refined pacing, hotels, hosting.',
      href: '/styles/luxury',
      title: 'Luxury',
    },
    {
      asset: 'family' as const,
      body: 'Balanced days for mixed ages.',
      href: '/styles/family',
      title: 'Family',
    },
    {
      asset: 'culture' as const,
      body: 'Stories, context, food, heritage.',
      href: '/styles/culture',
      title: 'Culture',
    },
    {
      asset: 'adventure' as const,
      body: 'A more active route rhythm.',
      href: '/styles/adventure',
      title: 'Adventure',
    },
    {
      asset: 'wellness' as const,
      body: 'Softer days and recovery space.',
      // Hub-safe until dedicated child pages exist — unique path for React keys.
      href: '/styles#wellness',
      title: 'Wellness',
    },
    {
      asset: 'business' as const,
      body: 'Meetings with cultural contrast.',
      href: '/styles#business',
      title: 'Business',
    },
  ],
  /** Why side cards (after featured Sapa) — image order matches Open Design Home. */
  whyCards: [
    { asset: 'family' as const, href: '/destinations', title: 'Flexible planning' },
    { asset: 'culture' as const, href: '/styles', title: 'Style matching' },
    { asset: 'luxury' as const, href: '/about-us', title: 'Collaborative care' },
  ],
} as const

/** Home sample journeys: target shows 3; Packages seed still uses all 5. */
export const WINGSSIDE_HIFI_HOME_JOURNEY_COUNT = 3

export const getWingsSideHiFiPublicUrl = (asset: WingsSideHiFiAssetKey): string =>
  `${WINGSSIDE_HIFI_PUBLIC_PREFIX}/${wingsSideHiFiAssets[asset].file}`

export const getWingsSideHiFiAlt = (asset: WingsSideHiFiAssetKey): string =>
  wingsSideHiFiAssets[asset].alt
