export type LeadFieldValue = boolean | number | string

export type LeadSubmissionField = {
  field: string
  value: LeadFieldValue
}

export type LeadSubmissionRequest = {
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

