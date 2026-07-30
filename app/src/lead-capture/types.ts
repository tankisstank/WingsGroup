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
  discovery?: LeadDiscoveryContext
  source?: string
  tourId?: string
  tourSlug?: string
}

export type LeadSubmissionRequest = {
  context?: LeadSubmissionContext
  formId: number | string
  honeypot?: string
  idempotencyKey: string
  submissionData: LeadSubmissionField[]
  turnstileToken?: string
}

export type LeadDeliveryMessage = {
  fields: Array<{ label: string; value: string }>
  formTitle: string
  siteCode: string
  submissionId: number | string
}

