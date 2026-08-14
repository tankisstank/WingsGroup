import type {
  ConsultationChannelKey,
  ConsultationChannelPublicState,
  WingsGroupLeadContract,
  WingsGroupLeadPublicConfig,
} from './types'
import { consultationChannelKeys } from './types'

export const WINGSGROUP_SITE_CODE = 'wings-group'
export const WINGSGROUP_PRIVACY_VERSION = 'wingsgroup-privacy-v1'
export const WINGSGROUP_CONSENT_VERSION = 'wingsgroup-contact-v1'
export const WINGSGROUP_LEAD_RETENTION_MONTHS = 24 as const
export const WINGSGROUP_DATA_CONTACT = 'info@doicanhviet.com'

export const WINGSGROUP_CONSENT_COPY = {
  en: 'I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy.',
  vi: 'Tôi đồng ý để WingsGroup sử dụng thông tin đã cung cấp nhằm liên hệ, tư vấn và chuyển yêu cầu đến bộ phận phù hợp theo Chính sách bảo mật.',
} as const

export const WINGSGROUP_POLICY_ROUTES = {
  en: '/en/chinh-sach-bao-mat',
  vi: '/chinh-sach-bao-mat',
} as const

type UnknownRecord = Record<string, unknown>

type ResolvedWingsGroupLeadGovernance = {
  channels: ConsultationChannelPublicState[]
  consentCopy: string
  consentVersion: typeof WINGSGROUP_CONSENT_VERSION
  policyHref: string
  retentionMonths: typeof WINGSGROUP_LEAD_RETENTION_MONTHS
}

const channelLabels = {
  en: { messenger: 'Messenger', whatsapp: 'WhatsApp', zalo: 'Zalo' },
  vi: { messenger: 'Messenger', whatsapp: 'WhatsApp', zalo: 'Zalo' },
} as const

const nameFieldAliases = new Set(['full-name', 'full_name', 'name'])
const needFieldAliases = new Set(['brief', 'message', 'need', 'needs'])

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const isConsultationChannelKey = (value: unknown): value is ConsultationChannelKey =>
  typeof value === 'string' && consultationChannelKeys.includes(value as ConsultationChannelKey)

const isApprovedHTTPSURL = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export const resolveWingsGroupLeadGovernance = (
  settingsInput: unknown,
  localeInput: unknown,
): ResolvedWingsGroupLeadGovernance | null => {
  const settings = asRecord(settingsInput)
  const wingsGroupV3 = asRecord(settings.wingsGroupV3)
  if (wingsGroupV3.enabled !== true) return null

  const privacy = asRecord(wingsGroupV3.privacy)
  if (
    asString(privacy.policyVersion) !== WINGSGROUP_PRIVACY_VERSION ||
    asString(privacy.consentVersion) !== WINGSGROUP_CONSENT_VERSION ||
    privacy.consentRequired !== true ||
    privacy.retentionMonths !== WINGSGROUP_LEAD_RETENTION_MONTHS ||
    asString(privacy.dataSubjectContact).toLowerCase() !== WINGSGROUP_DATA_CONTACT ||
    privacy.interBranchTransferAllowed !== true ||
    asString(privacy.policyRouteVi) !== WINGSGROUP_POLICY_ROUTES.vi ||
    asString(privacy.policyRouteEn) !== WINGSGROUP_POLICY_ROUTES.en
  ) {
    return null
  }

  const locale = localeInput === 'en' ? 'en' : 'vi'
  const channels: ConsultationChannelPublicState[] = []
  const seen = new Set<ConsultationChannelKey>()
  for (const channelInput of Array.isArray(wingsGroupV3.consultationChannels)
    ? wingsGroupV3.consultationChannels
    : []) {
    const channel = asRecord(channelInput)
    if (!isConsultationChannelKey(channel.key) || seen.has(channel.key)) continue
    seen.add(channel.key)
    if (channel.state === 'disabled') continue

    const approved =
      channel.state === 'approved' &&
      isApprovedHTTPSURL(channel.url) &&
      Boolean(asString(channel.owner)) &&
      Boolean(asString(channel.sla)) &&
      Boolean(asString(channel.trackingReference))

    channels.push({
      ...(approved ? { href: asString(channel.url) } : {}),
      key: channel.key,
      label: channelLabels[locale][channel.key],
      state: approved ? 'approved' : 'pending-update',
    })
  }

  return {
    channels,
    consentCopy: WINGSGROUP_CONSENT_COPY[locale],
    consentVersion: WINGSGROUP_CONSENT_VERSION,
    policyHref: WINGSGROUP_POLICY_ROUTES[locale],
    retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
  }
}

export const toWingsGroupLeadPublicConfig = (
  settings: unknown,
  locale: unknown,
): WingsGroupLeadPublicConfig => {
  const governance = resolveWingsGroupLeadGovernance(settings, locale)
  return governance
    ? { available: true, enabled: true, ...governance }
    : { available: false, enabled: true, reason: 'configuration-unavailable' }
}

export const parseWingsGroupLeadContract = (input: unknown): WingsGroupLeadContract => {
  const contract = asRecord(input)
  const keys = Object.keys(contract)
  if (
    keys.some((key) => !['consent', 'consentVersion', 'preferredChannel'].includes(key)) ||
    typeof contract.consent !== 'boolean' ||
    typeof contract.consentVersion !== 'string' ||
    (contract.preferredChannel !== undefined &&
      !isConsultationChannelKey(contract.preferredChannel))
  ) {
    throw new Error('Lead contract is invalid.')
  }

  return {
    consent: contract.consent,
    consentVersion: contract.consentVersion,
    ...(isConsultationChannelKey(contract.preferredChannel)
      ? { preferredChannel: contract.preferredChannel }
      : {}),
  }
}

export const validateWingsGroupLeadContract = (
  contract: WingsGroupLeadContract | undefined,
  governance: ResolvedWingsGroupLeadGovernance,
): WingsGroupLeadContract => {
  if (
    !contract ||
    contract.consent !== true ||
    contract.consentVersion !== governance.consentVersion
  ) {
    throw new Error('Required consent is missing.')
  }
  return contract
}

export const validateWingsGroupRequiredFields = (
  fields: Array<{ field: string; value: string }>,
): void => {
  const hasValue = (aliases: Set<string>) =>
    fields.some(({ field, value }) => aliases.has(field.toLowerCase()) && Boolean(value.trim()))

  if (!hasValue(nameFieldAliases) || !hasValue(needFieldAliases)) {
    throw new Error('Required WingsGroup lead fields are missing.')
  }
}

export const normalizeTrustedLeadSourcePath = (input: unknown): string => {
  if (typeof input !== 'string') return '/'
  const path = input.trim()
  if (!path.startsWith('/') || path.length > 512 || /[\u0000-\u001f\u007f]/u.test(path)) return '/'
  return path.split(/[?#]/u, 1)[0] || '/'
}

export const getWingsGroupRetentionUntil = (consentedAt: Date): string => {
  const year = consentedAt.getUTCFullYear() + 2
  const month = consentedAt.getUTCMonth()
  const day = consentedAt.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const result = new Date(consentedAt)
  result.setUTCFullYear(year, month, Math.min(day, lastDay))
  return result.toISOString()
}

export const getFormSiteCode = (formInput: unknown): string | null => {
  const form = asRecord(formInput)
  const site = asRecord(form.site)
  return asString(site.code) || null
}
