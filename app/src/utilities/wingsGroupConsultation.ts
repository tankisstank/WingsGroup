/**
 * A short-lived handoff between the consultation dialog and the contact form.
 *
 * The hash identifies the destination for normal links. This session key is
 * deliberately separate: it asks the receiving page to move keyboard focus to
 * its first field only after client-side navigation has completed.
 */
export const WINGSGROUP_CONTACT_FOCUS_SESSION_KEY = 'wingsgroup-contact-focus'
export const WINGSGROUP_CONTACT_FORM_ANCHOR = 'contact-form'

export const WINGSGROUP_INQUIRY_CONTEXT_SESSION_KEY = 'wingsgroup-inquiry-context'

export const WINGSGROUP_INQUIRY_KEYS = [
  'outbound',
  'vietnam',
  'airport',
  'mice',
  'support',
] as const

export type WingsGroupInquiryKey = (typeof WINGSGROUP_INQUIRY_KEYS)[number]

export const isWingsGroupInquiryKey = (value: unknown): value is WingsGroupInquiryKey =>
  typeof value === 'string' && WINGSGROUP_INQUIRY_KEYS.some((inquiryKey) => inquiryKey === value)

export const setWingsGroupInquiryContext = (value: unknown): boolean => {
  if (typeof window === 'undefined' || !isWingsGroupInquiryKey(value)) return false

  try {
    window.sessionStorage.setItem(WINGSGROUP_INQUIRY_CONTEXT_SESSION_KEY, value)
    return true
  } catch {
    return false
  }
}
