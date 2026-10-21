import type { Form } from '@/payload-types'

import type {
  LeadDiscoveryContext,
  LeadSubmissionContext,
  LeadSubmissionField,
  LeadSubmissionRequest,
} from './types'
import { parseWingsGroupLeadContract } from './wingsGroupV3'

export const MAX_LEAD_BODY_BYTES = 32 * 1024
const MAX_FIELD_VALUE_LENGTH = 4096
const MAX_FIELDS = 50
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
const CONTEXT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const CONTEXT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const CONTEXT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,95}$/
const CONTEXT_SOURCE_PATTERN = /^[A-Za-z0-9-]{1,48}$/
const CONTEXT_SEARCH_PATTERN = /^.{1,80}$/u
const CONTEXT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CONTEXT_INTENTS = ['contact', 'hold-seat', 'inquiry', 'request-quote'] as const

export class LeadValidationError extends Error {}

const hasName = (field: NonNullable<Form['fields']>[number]): field is Extract<typeof field, { name: string }> =>
  'name' in field && typeof field.name === 'string'

const normalizeValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  throw new LeadValidationError('Unsupported field value.')
}

const assertPlainObject = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LeadValidationError(message)
  }
  return value as Record<string, unknown>
}

const assertOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  message: string,
) => {
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new LeadValidationError(message)
  }
}

const optionalContextValue = (
  value: unknown,
  pattern: RegExp,
  message: string,
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new LeadValidationError(message)
  }
  return value
}

export const parseLeadContext = (input: unknown): LeadSubmissionContext | undefined => {
  if (input === undefined || input === null) return undefined

  const context = assertPlainObject(input, 'Submission context is invalid.')
  assertOnlyKeys(
    context,
    ['departureDate', 'departureId', 'discovery', 'guests', 'intent', 'source', 'tourId', 'tourSlug'],
    'Submission context is invalid.',
  )

  let discovery: LeadDiscoveryContext | undefined
  if (context.discovery !== undefined && context.discovery !== null) {
    const candidate = assertPlainObject(context.discovery, 'Discovery context is invalid.')
    assertOnlyKeys(
      candidate,
      ['destination', 'duration', 'q', 'style', 'type'],
      'Discovery context is invalid.',
    )
    discovery = {
      destination: optionalContextValue(
        candidate.destination,
        CONTEXT_CODE_PATTERN,
        'Discovery destination is invalid.',
      ),
      duration: optionalContextValue(
        candidate.duration,
        CONTEXT_CODE_PATTERN,
        'Discovery duration is invalid.',
      ),
      q: optionalContextValue(candidate.q, CONTEXT_SEARCH_PATTERN, 'Discovery search is invalid.'),
      style: optionalContextValue(
        candidate.style,
        CONTEXT_CODE_PATTERN,
        'Discovery style is invalid.',
      ),
      type: optionalContextValue(candidate.type, CONTEXT_CODE_PATTERN, 'Discovery type is invalid.'),
    }
    if (!Object.values(discovery).some(Boolean)) discovery = undefined
  }

  const departureDate = optionalContextValue(
    context.departureDate,
    CONTEXT_DATE_PATTERN,
    'Departure date is invalid.',
  )
  if (departureDate) {
    const date = new Date(`${departureDate}T00:00:00.000Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== departureDate) {
      throw new LeadValidationError('Departure date is invalid.')
    }
  }

  const intent = context.intent
  if (
    intent !== undefined &&
    intent !== null &&
    intent !== '' &&
    !CONTEXT_INTENTS.includes(intent as (typeof CONTEXT_INTENTS)[number])
  ) {
    throw new LeadValidationError('Submission intent is invalid.')
  }

  const parsed: LeadSubmissionContext = {
    departureDate,
    departureId: optionalContextValue(
      context.departureId,
      CONTEXT_ID_PATTERN,
      'Departure identifier is invalid.',
    ),
    discovery,
    guests:
      typeof context.guests === 'number' && Number.isInteger(context.guests) && context.guests >= 1 && context.guests <= 99
        ? context.guests
        : typeof context.guests === 'string' && /^[1-9]\d{0,1}$/.test(context.guests.trim())
          ? parseInt(context.guests.trim(), 10)
          : undefined,
    intent: typeof intent === 'string' && intent ? (intent as LeadSubmissionContext['intent']) : undefined,
    source: optionalContextValue(
      context.source,
      CONTEXT_SOURCE_PATTERN,
      'Submission source is invalid.',
    ),
    tourId: optionalContextValue(context.tourId, CONTEXT_ID_PATTERN, 'Tour identifier is invalid.'),
    tourSlug: optionalContextValue(
      context.tourSlug,
      CONTEXT_SLUG_PATTERN,
      'Tour slug is invalid.',
    ),
  }

  return Object.values(parsed).some(Boolean) ? parsed : undefined
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
  assertOnlyKeys(
    body,
    [
      'context',
      'formId',
      'honeypot',
      'idempotencyKey',
      'leadContract',
      'locale',
      'submissionData',
      'turnstileToken',
    ],
    'Request body is invalid.',
  )
  const formId = body.formId
  const idempotencyKey = body.idempotencyKey
  if (body.locale !== undefined && body.locale !== 'en' && body.locale !== 'vi') {
    throw new LeadValidationError('Locale is invalid.')
  }

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
    context: parseLeadContext(body.context),
    formId: formId as number | string,
    honeypot: typeof body.honeypot === 'string' ? body.honeypot : undefined,
    idempotencyKey,
    leadContract:
      body.leadContract === undefined
        ? undefined
        : (() => {
            try {
              return parseWingsGroupLeadContract(body.leadContract)
            } catch {
              throw new LeadValidationError('Lead contract is invalid.')
            }
          })(),
    submissionData,
    locale: body.locale as 'en' | 'vi' | undefined,
    turnstileToken: typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
  }
}

export const validateFieldsForForm = (
  form: Form,
  fields: LeadSubmissionField[],
  options: { phonePattern?: RegExp } = {},
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

    if (definition.blockType === 'number' && normalizedValue) {
      const numberValue = Number(normalizedValue)
      if (!Number.isFinite(numberValue)) throw new LeadValidationError('Number field is invalid.')
      if (name === 'guests' && (!Number.isInteger(numberValue) || numberValue < 1)) {
        throw new LeadValidationError('Guest count is invalid.')
      }
    }

    if (/(?:^|[-_])phone$|^tel$/i.test(name) && normalizedValue) {
      const compactPhone = normalizedValue.replace(/[\s().-]/gu, '')
      const phonePattern = options.phonePattern || /^\+?\d{8,15}$/u
      if (!phonePattern.test(compactPhone)) {
        throw new LeadValidationError('Phone field is invalid.')
      }
    }

    if (name === 'departure-date' && normalizedValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalizedValue)) {
        throw new LeadValidationError('Departure date field is invalid.')
      }
      const date = new Date(`${normalizedValue}T00:00:00.000Z`)
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalizedValue) {
        throw new LeadValidationError('Departure date field is invalid.')
      }
    }

    if (definition.blockType === 'checkbox' && typeof value !== 'boolean') {
      throw new LeadValidationError('Checkbox field is invalid.')
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
    const submitted = normalized.find(({ field }) => field === definition.name)
    const hasRequiredValue =
      definition.blockType === 'checkbox'
        ? submitted?.value === 'true'
        : Boolean(submitted?.value)
    if (definition.required && !hasRequiredValue) {
      throw new LeadValidationError('A required field is missing.')
    }
  }

  return normalized
}
