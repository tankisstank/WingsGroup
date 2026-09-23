export type LeadFieldValue = boolean | number | string

export type LeadSubmissionField = {
  field: string
  value: LeadFieldValue
}

export type LeadDiscoveryContext = {
  destination?: string
  duration?: string
  q?: string
  style?: string
  type?: string
}

export type LeadSubmissionContext = {
  departureDate?: string
  departureId?: string
  discovery?: LeadDiscoveryContext
  intent?: 'contact' | 'hold-seat' | 'inquiry' | 'request-quote'
  source?: string
  tourId?: string
  tourSlug?: string
}

export const consultationChannelKeys = ['zalo', 'whatsapp', 'messenger', 'callback'] as const

export type ConsultationChannelKey = (typeof consultationChannelKeys)[number]

export type WingsGroupLeadContract = {
  consent: boolean
  consentVersion: string
  preferredChannel?: ConsultationChannelKey
}

export type LeadSubmissionRequest = {
  context?: LeadSubmissionContext
  formId: number | string
  honeypot?: string
  idempotencyKey: string
  leadContract?: WingsGroupLeadContract
  submissionData: LeadSubmissionField[]
  turnstileToken?: string
}

export type ConsultationChannelPublicState = {
  href?: string
  key: ConsultationChannelKey
  label: string
  state: 'approved' | 'pending-update'
}

export type WingsGroupLeadPublicConfig =
  | { enabled: false }
  | {
      available: false
      enabled: true
      reason: 'configuration-unavailable'
    }
  | {
      available: true
      channels: ConsultationChannelPublicState[]
      consentCopy: string
      consentVersion: string
      enabled: true
      policyHref: string
      retentionMonths: 24
    }

export type LeadDeliveryMessage = {
  fields: Array<{ label: string; value: string }>
  formTitle: string
  siteCode: string
  submissionId: number | string
}
