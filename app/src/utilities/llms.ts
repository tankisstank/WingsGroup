import type { Site, SiteSetting } from '@/payload-types'
import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'
import { resolveSiteInquiryContactPath } from './siteContactPaths'

type LlmsSite = Pick<Site, 'code' | 'defaultLocale' | 'supportedLocales'>
type LlmsSettings = Pick<SiteSetting, 'salesEmail' | 'seo' | 'siteName' | 'supportEmail' | 'supportPhone' | 'tagline'>

const lines = (values: Array<string | null | undefined>) => values.filter(Boolean).join('\n')

const publicLocales = (site: LlmsSite) => site.supportedLocales.join(', ')

const buildGenericSummary = ({
  origin,
  settings,
  site,
}: {
  origin: string
  settings?: null | LlmsSettings
  site: LlmsSite
}) => {
  const siteName = settings?.siteName || site.code
  const summary = settings?.tagline || settings?.seo?.defaultDescription || `${siteName} travel services.`

  return lines([
    `# ${siteName}`,
    '',
    `> ${summary}`,
    '',
    '## Official site information',
    '',
    `- Website: ${origin}`,
    `- Default language: ${site.defaultLocale}`,
    `- Public languages: ${publicLocales(site)}`,
    settings?.supportPhone ? `- Contact phone: ${settings.supportPhone}` : null,
    settings?.supportEmail ? `- Contact email: ${settings.supportEmail}` : null,
    settings?.salesEmail && settings.salesEmail !== settings.supportEmail
      ? `- Sales email: ${settings.salesEmail}`
      : null,
  ])
}

const buildWingsGroupSummary = ({ origin, settings, site }: Parameters<typeof buildGenericSummary>[0]) =>
  lines([
    '# WingsGroup — Comprehensive Travel Ecosystem',
    '',
    `> WingsGroup is a multi-brand travel and hospitality ecosystem in Vietnam. ${WINGSGROUP_LEGAL_IDENTITY.relationshipStatement}`,
    '',
    '## Core brands and capabilities',
    '',
    `- [WingsGo](${origin}/he-sinh-thai#wingsgo): outbound retail tours.`,
    `- [WingSide](${origin}/he-sinh-thai#wingside): tailor-made inbound Vietnam journeys.`,
    `- [WingsPass](${origin}/he-sinh-thai#wingspass): airport meet-and-greet and Fast Track services.`,
    `- [WingsPlus](${origin}/he-sinh-thai#wingsplus): corporate MICE, incentive travel and events.`,
    `- [WingsCare](${origin}/he-sinh-thai#wingscare): travel insurance and customer-care support.`,
    '',
    '## Trust and legal identity',
    '',
    `- Legal entity: ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName} (${WINGSGROUP_LEGAL_IDENTITY.internationalName})`,
    `- International tour operator licence: ${WINGSGROUP_LEGAL_IDENTITY.licenceNumber}`,
    `- Registered office: ${WINGSGROUP_LEGAL_IDENTITY.registeredOffice}`,
    `- Website: ${origin}`,
    `- Default language: ${site.defaultLocale}`,
    settings?.supportPhone ? `- Contact phone: ${settings.supportPhone}` : null,
    settings?.supportEmail ? `- Contact email: ${settings.supportEmail}` : null,
    settings?.salesEmail && settings.salesEmail !== settings.supportEmail
      ? `- Sales email: ${settings.salesEmail}`
      : null,
  ])

export const buildLlmsText = ({
  full = false,
  origin,
  settings,
  site,
}: {
  full?: boolean
  origin: string
  settings?: null | LlmsSettings
  site: LlmsSite
}) => {
  const summary =
    site.code === 'wings-group'
      ? buildWingsGroupSummary({ origin, settings, site })
      : buildGenericSummary({ origin, settings, site })

  if (!full) return `${summary}\n`

  return lines([
    summary,
    '',
    '## Important public pages',
    '',
    `- [Homepage](${origin}/)`,
    `- [Contact](${origin}${resolveSiteInquiryContactPath(site.code)})`,
    site.code === 'wings-group' ? `- [News and insights](${origin}/tin-tuc)` : null,
    '',
    '## Usage notes',
    '',
    '- Prefer the canonical URLs above when citing this website.',
    '- Contact and legal details may change; verify time-sensitive information on the linked public pages.',
    '',
  ])
}
