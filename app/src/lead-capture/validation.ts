import type { Form } from '@/payload-types'

import type { LeadSubmissionField, LeadSubmissionRequest } from './types'

export const MAX_LEAD_BODY_BYTES = 32 * 1024
const MAX_FIELD_VALUE_LENGTH = 4096
const MAX_FIELDS = 50
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

export class LeadValidationError extends Error {}

const hasName = (field: NonNullable<Form['fields']>[number]): field is Extract<typeof field, { name: string }> =>
  'name' in field && typeof field.name === 'string'

const normalizeValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  throw new LeadValidationError('Unsupported field value.')
}

export const parseLeadRequest = (rawBody: string): LeadSubmissionRequest => {
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_LEAD_BODY_BYTES) {
    throw new LeadValidationError('Request body is too large.')
  }

  let input: unknown
  try {
    input = JSON.parse(rawBody)
  } catch {
    throw new LeadValidationError('Request body is not valid JSON.')
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LeadValidationError('Request body is invalid.')
  }

  const body = input as Record<string, unknown>
  const formId = body.formId
  const idempotencyKey = body.idempotencyKey

  if (!['number', 'string'].includes(typeof formId) || String(formId).length > 64) {
    throw new LeadValidationError('Form identifier is invalid.')
  }

  if (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw new LeadValidationError('Idempotency key is invalid.')
  }

  if (!Array.isArray(body.submissionData) || body.submissionData.length > MAX_FIELDS) {
    throw new LeadValidationError('Submission fields are invalid.')
  }

  const submissionData = body.submissionData.map((entry): LeadSubmissionField => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new LeadValidationError('Submission field is invalid.')
    }

    const candidate = entry as Record<string, unknown>
    if (typeof candidate.field !== 'string' || candidate.field.length > 128) {
      throw new LeadValidationError('Submission field name is invalid.')
    }

    if (!['boolean', 'number', 'string'].includes(typeof candidate.value)) {
      throw new LeadValidationError('Submission field value is invalid.')
    }

    return { field: candidate.field, value: candidate.value as boolean | number | string }
  })

  return {
    formId: formId as number | string,
    honeypot: typeof body.honeypot === 'string' ? body.honeypot : undefined,
    idempotencyKey,
    submissionData,
    turnstileToken: typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
  }
}

export const validateFieldsForForm = (
  form: Form,
  fields: LeadSubmissionField[],
): Array<{ field: string; label: string; value: string }> => {
  const definitions = new Map(
    (form.fields || []).filter(hasName).map((field) => [field.name, field]),
  )
  const seen = new Set<string>()
  const normalized = fields.map(({ field: name, value }) => {
    const definition = definitions.get(name)
    if (!definition || seen.has(name)) {
      throw new LeadValidationError('Submission contains an unknown or duplicate field.')
    }
    seen.add(name)

    const normalizedValue = normalizeValue(value)
    if (normalizedValue.length > MAX_FIELD_VALUE_LENGTH) {
      throw new LeadValidationError('Submission field is too long.')
    }

    if (definition.blockType === 'email' && normalizedValue) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
        throw new LeadValidationError('Email field is invalid.')
      }
    }

    if (definition.blockType === 'number' && normalizedValue && !Number.isFinite(Number(normalizedValue))) {
      throw new LeadValidationError('Number field is invalid.')
    }

    if (definition.blockType === 'select' && normalizedValue) {
      const allowedValues = new Set((definition.options || []).map((option) => option.value))
      if (!allowedValues.has(normalizedValue)) {
        throw new LeadValidationError('Select field is invalid.')
      }
    }

    return {
      field: name,
      label: definition.label || name,
      value: normalizedValue,
    }
  })

  for (const definition of definitions.values()) {
    if (definition.required && !normalized.some(({ field, value }) => field === definition.name && value)) {
      throw new LeadValidationError('A required field is missing.')
    }
  }

  return normalized
}

