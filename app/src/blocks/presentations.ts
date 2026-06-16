export const featurePresentationDefinitions = [
  { label: 'Icon grid', value: 'icon-grid' },
  { label: 'Bento', value: 'bento' },
  { label: 'Alternating rows', value: 'alternating' },
  { label: 'Tabs', value: 'tabs' },
  { label: 'Accordion', value: 'accordion' },
  { label: 'Sticky reveal', value: 'sticky-reveal' },
  { label: 'Icon wall', value: 'icon-wall' },
  { label: 'Before / after', value: 'before-after' },
] as const

export const ctaPresentationDefinitions = [
  { label: 'Card', value: 'card' },
  { label: 'Full bleed', value: 'full-bleed' },
  { label: 'Split card', value: 'split-card' },
  { label: 'Sticky bar', value: 'sticky-bar' },
  { label: 'Patterned', value: 'patterned' },
  { label: 'Dual action', value: 'dual-action' },
  { label: 'Inline form', value: 'inline-form' },
  { label: 'Testimonial CTA', value: 'testimonial' },
] as const

export const faqPresentationDefinitions = [
  { label: 'Single column accordion', value: 'single-column' },
  { label: 'Two column accordion', value: 'two-column' },
  { label: 'Chat bubbles', value: 'chat-bubbles' },
  { label: 'Searchable index', value: 'searchable' },
  { label: 'Categorized groups', value: 'categorized' },
] as const

export const pricingPresentationDefinitions = [
  { label: 'Departure table', value: 'departure-table' },
  { label: 'Tier cards', value: 'tier-cards' },
  { label: 'Comparison table', value: 'comparison-table' },
  { label: 'Single offer', value: 'single-offer' },
  { label: 'Package split', value: 'package-split' },
  { label: 'Mobile stacked', value: 'mobile-stacked' },
] as const

export const statsPresentationDefinitions = [
  { label: 'Inline bar', value: 'inline-bar' },
  { label: 'Card grid', value: 'card-grid' },
  { label: 'Editorial numbers', value: 'editorial' },
  { label: 'Logo proof', value: 'logo-proof' },
  { label: 'Progress metrics', value: 'progress' },
  { label: 'Split statement', value: 'split-statement' },
  { label: 'Floating metrics', value: 'floating' },
] as const

export const testimonialPresentationDefinitions = [
  { label: 'Quote grid', value: 'quote-grid' },
  { label: 'Marquee', value: 'marquee' },
  { label: 'Masonry', value: 'masonry' },
  { label: 'Featured quote', value: 'featured' },
  { label: 'Video stories', value: 'video' },
  { label: 'Social wall', value: 'social-wall' },
  { label: 'Logo cloud', value: 'logo-cloud' },
  { label: 'Carousel', value: 'carousel' },
] as const

export const comparisonPresentationDefinitions = [
  { label: 'Feature matrix', value: 'matrix' },
  { label: 'Before / after', value: 'before-after' },
  { label: 'Package cards', value: 'package-cards' },
] as const

export const archivePresentationDefinitions = [
  { label: 'Card grid', value: 'card-grid' },
  { label: 'Magazine', value: 'magazine' },
  { label: 'Compact list', value: 'compact-list' },
] as const

export const contentPresentationDefinitions = [
  { label: 'Columns', value: 'columns' },
  { label: 'Reading view', value: 'reading' },
  { label: 'Sidebar table of contents', value: 'sidebar-toc' },
  { label: 'Editorial split', value: 'editorial-split' },
] as const

export const formPresentationDefinitions = [
  { label: 'Split contact', value: 'split-contact' },
  { label: 'Centered card', value: 'centered-card' },
  { label: 'Minimal', value: 'minimal' },
  { label: 'Support channels', value: 'support-channels' },
] as const

export const asSelectOptions = (
  definitions: readonly { label: string; value: string }[],
) => definitions.map(({ label, value }) => ({ label, value }))

